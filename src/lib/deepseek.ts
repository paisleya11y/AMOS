import axios from 'axios'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

export async function callDeepSeek(
  messages: ChatMessage[],
  options?: {
    temperature?: number
    maxTokens?: number
    jsonMode?: boolean
  }
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set')

  const maxRetries = 2
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[DeepSeek API attempt ${attempt + 1}] Sending request, messages: ${messages.length}`)

      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages,
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 8000,
          response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 45000, // 增加到45秒超时
        }
      )

      const content = response.data.choices[0]?.message?.content
      if (!content) {
        throw new Error('DeepSeek返回了空响应内容')
      }

      console.log(`[DeepSeek API attempt ${attempt + 1} succeeded] Response length: ${content.length}`)
      return content

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`[DeepSeek API attempt ${attempt + 1} failed]`, {
        error: lastError.message,
        isAxiosError: axios.isAxiosError(error),
        status: axios.isAxiosError(error) ? error.response?.status : undefined,
        data: axios.isAxiosError(error) ? error.response?.data : undefined
      })

      if (attempt === maxRetries) {
        throw new Error(`DeepSeek API调用失败，已重试${maxRetries}次: ${lastError.message}`)
      }

      // 指数退避重试
      const delay = 1500 * Math.pow(2, attempt)
      console.log(`等待${delay}ms后重试...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError! // 永远不会执行到这里，但为了TypeScript需要
}

export async function callDeepSeekJSON<T>(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  const maxRetries = 2
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = await callDeepSeek(messages, {
        ...options,
        jsonMode: true,
      })

      console.log(`[DeepSeek JSON attempt ${attempt + 1}] Raw response length: ${raw.length}`)

      try {
        return JSON.parse(raw) as T
      } catch {
        // 尝试从响应中提取JSON
        const match = raw.match(/\{[\s\S]*\}/)
        if (match) {
          console.log(`[DeepSeek JSON] Extracted JSON from response, length: ${match[0].length}`)
          return JSON.parse(match[0]) as T
        }

        lastError = new Error(`DeepSeek returned invalid JSON (attempt ${attempt + 1}): ${raw.slice(0, 200)}`)
        console.error(lastError.message)
        throw lastError
      }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`[DeepSeek JSON attempt ${attempt + 1} failed]`, error)

      if (attempt === maxRetries) {
        throw new Error(`DeepSeek API调用失败，已重试${maxRetries}次: ${lastError.message}`)
      }

      // 指数退避重试
      const delay = 1000 * Math.pow(2, attempt)
      console.log(`等待${delay}ms后重试...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError! // 永远不会执行到这里，但为了TypeScript需要
}
