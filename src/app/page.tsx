'use client'

import { useState } from 'react'
import ScriptSelector from '../components/ScriptSelector'
import Script1Panel from '../components/Script1Panel'
import Script2Panel from '../components/Script2Panel'
import Script3Panel from '../components/Script3Panel'
import Script4Panel from '../components/Script4Panel'
import Script5Panel from '../components/Script5Panel'
import Script6Panel from '../components/Script6Panel'
import Script7Panel from '../components/Script7Panel'

export default function Home() {
  const [selectedScript, setSelectedScript] = useState<'script1' | 'script2' | 'script3' | 'script4' | 'script5' | 'script6' | 'script7' | null>(null)

  const renderContent = () => {
    switch (selectedScript) {
      case 'script1':
        return <Script1Panel onBack={() => setSelectedScript(null)} />
      case 'script2':
        return <Script2Panel onBack={() => setSelectedScript(null)} />
      case 'script3':
        return <Script3Panel onBack={() => setSelectedScript(null)} />
      case 'script4':
        return <Script4Panel onBack={() => setSelectedScript(null)} />
      case 'script5':
        return <Script5Panel onBack={() => setSelectedScript(null)} />
      case 'script6':
        return <Script6Panel onBack={() => setSelectedScript(null)} />
      case 'script7':
        return <Script7Panel onBack={() => setSelectedScript(null)} />
      default:
        return <ScriptSelector onSelectScript={setSelectedScript} />
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-noise opacity-30" />
      
      {/* Floating Background Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl floating" />
      <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full blur-xl floating-delayed" />
      <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full blur-xl floating" />
      <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-xl floating-delayed" />
      
      {/* Geometric Shapes */}
      <div className="absolute top-1/4 left-1/2 w-2 h-2 bg-white/30 rounded-full rotating-slow" />
      <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-blue-400/50 rounded-full rotating-slow-reverse" />
      <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-purple-400/40 rounded-full rotating-slow" />
      
      {renderContent()}
    </main>
  )
} 