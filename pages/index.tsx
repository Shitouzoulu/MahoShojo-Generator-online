import React, { useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import { generateMagicalGirlWithAI, type AIGeneratedMagicalGirl } from '../lib/ai'
import Image from 'next/image'

interface MagicalGirl {
  realName: string
  name: string
  flowerDescription: string
  appearance: {
    height: string
    weight: string
    hairColor: string
    hairStyle: string
    eyeColor: string
    skinTone: string
    wearing: string
    specialFeature: string
    mainColor: number
    firstPageColor: string
    secondPageColor: string
  }
  spell: string
  level: string
  levelEmoji: string
}

// 保留原有的 levels 数组和相关函数
const levels = [
  { name: '种', emoji: '🌱' },
  { name: '芽', emoji: '🍃' },
  { name: '叶', emoji: '🌿' },
  { name: '蕾', emoji: '🌸' },
  { name: '花', emoji: '🌺' },
  { name: '宝石权杖', emoji: '💎' }
]

// 定义8套渐变配色方案
const gradientColors = [
  // 0 - 红色系
  { first: '#ff6b6b', second: '#ee5a6f' },
  // 1 - 橙色系
  { first: '#ff922b', second: '#ffa94d' },
  // 2 - 青色系
  { first: '#22b8cf', second: '#66d9e8' },
  // 3 - 蓝色系
  { first: '#5c7cfa', second: '#748ffc' },
  // 4 - 紫色系
  { first: '#9775fa', second: '#b197fc' },
  // 5 - 粉色系
  { first: '#ff9a9e', second: '#fecfef' },
  // 6 - 黄色系
  { first: '#f59f00', second: '#fcc419' },
  // 7 - 绿色系
  { first: '#51cf66', second: '#8ce99a' }
]

function seedRandom(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function getRandomFromSeed<T>(array: T[], seed: number, offset: number = 0): T {
  const index = (seed + offset) % array.length
  return array[index]
}

// 使用 AI 生成魔法少女（除了 level）
async function generateMagicalGirl(inputName: string): Promise<MagicalGirl> {
  // 使用 AI 生成大部分属性
  const aiGenerated: AIGeneratedMagicalGirl = await generateMagicalGirlWithAI(inputName)

  // 保留原有的随机 level 生成逻辑
  const seed = seedRandom(aiGenerated.flowerName + inputName)
  const level = getRandomFromSeed(levels, seed, 6)

  return {
    realName: inputName,
    name: aiGenerated.flowerName,
    flowerDescription: aiGenerated.flowerDescription,
    appearance: aiGenerated.appearance,
    spell: aiGenerated.spell,
    level: level.name,
    levelEmoji: level.emoji
  }
}

export default function Home() {
  const [inputName, setInputName] = useState('')
  const [magicalGirl, setMagicalGirl] = useState<MagicalGirl | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  const handleGenerate = async () => {
    if (!inputName.trim()) return

    setIsGenerating(true)

    try {
      const result = await generateMagicalGirl(inputName.trim())
      setMagicalGirl(result)
    } catch (err) {
      console.error('生成魔法少女失败:', err)
      // 显示错误提示
      const errorMessage = err instanceof Error ? err.message : '生成失败，请稍后重试'
      alert(`✨ 魔法失效了！\n\n${errorMessage}\n\n请检查网络连接后重试~`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveImage = async () => {
    if (!resultRef.current) return

    try {
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      })

      const link = document.createElement('a')
      link.download = `${magicalGirl?.name || '魔法少女'}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      console.error('保存图片失败:', error)
      alert('保存图片失败，请重试')
    }
  }

  return (
    <div className="magic-background">
      <div className="container">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
            <Image src="/logo.svg" width={250} height={160} alt="Logo" style={{ display: 'block' }} />
          </div>
          <p className="subtitle text-center">让我康康你是什么魔法少女！</p>

          <div className="input-group">
            <label htmlFor="name" className="input-label">
              请输入你的名字：
            </label>
            <input
              id="name"
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              className="input-field"
              placeholder="例如："
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!inputName.trim() || isGenerating}
            className="generate-button"
          >
            {isGenerating ? '(≖ᴗ≖)✧✨' : 'へんしん(ﾉﾟ▽ﾟ)ﾉ! '}
          </button>

          {magicalGirl && (
            <div
              ref={resultRef}
              className="result-card"
              style={{
                background: `linear-gradient(135deg, ${gradientColors[magicalGirl.appearance.mainColor]?.first || gradientColors[5].first} 0%, ${gradientColors[magicalGirl.appearance.mainColor]?.second || gradientColors[5].second} 100%)`
              }}
            >
              <div className="flex justify-center items-center" style={{ marginBottom: '1rem' }}>
                <Image src="/mahou-title.svg" width={300} height={180} alt="Logo" style={{ display: 'block' }} />
              </div>
              <div className="result-content">
                <div className="result-item">
                  <div className="result-label">💝 真名解放</div>
                  <div className="result-value">{magicalGirl.realName}</div>
                </div>
                <div className="result-item">
                  <div className="result-label">💝 魔法少女名</div>
                  <div className="result-value">
                    {magicalGirl.name}
                    <div style={{ fontStyle: 'italic', marginTop: '8px', fontSize: '14px', opacity: 0.9 }}>
                      「{magicalGirl.flowerDescription}」
                    </div>
                  </div>
                </div>

                <div className="result-item">
                  <div className="result-label">👗 外貌特征</div>
                  <div className="result-value">
                    身高：{magicalGirl.appearance.height}<br />
                    体重：{magicalGirl.appearance.weight}<br />
                    发色：{magicalGirl.appearance.hairColor}<br />
                    发型：{magicalGirl.appearance.hairStyle}<br />
                    瞳色：{magicalGirl.appearance.eyeColor}<br />
                    肤色：{magicalGirl.appearance.skinTone}<br />
                    穿着：{magicalGirl.appearance.wearing}<br />
                    特征：{magicalGirl.appearance.specialFeature}
                  </div>
                </div>

                <div className="result-item">
                  <div className="result-label">✨ 变身咒语</div>
                  <div className="result-value">&ldquo;{magicalGirl.spell}&rdquo;</div>
                </div>

                <div className="result-item">
                  <div className="result-label">⭐ 魔法等级</div>
                  <div className="result-value">
                    <span className="level-badge">
                      {magicalGirl.levelEmoji} {magicalGirl.level}
                    </span>
                  </div>
                </div>

                <button onClick={handleSaveImage} className="save-button">
                  📱 保存为图片
                </button>
                <div className="save-instructions">
                  点击按钮下载图片，或长按结果卡片截图保存
                </div>
              </div>
            </div>
          )}
          <div className="text-center w-full text-sm text-gray-500" style={{ marginTop: '8px' }}> 立绘生成功能开发中（大概）... </div>
        </div>

        <footer className="footer">
          <p>
            <a href="https://github.com/colasama" target="_blank" rel="noopener noreferrer" className="footer-link">@Colanns</a> 急速出品
          </p>
        </footer>
      </div>
    </div>
  )
} 