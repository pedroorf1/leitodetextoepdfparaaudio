import React, { useEffect } from 'react';
import { usePdfExtractor } from './hooks/usePdfExtractor';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import './index.css';

function App() {
  const { text, setText, fileName, isProcessing, extractTextFromPdf } = usePdfExtractor();

  // 🔄 SINCRONIZAÇÃO CORRIGIDA: Importando exatamente o que o useSpeechSynthesis exporta
  const {
    status,
    isPlaying,
    aylaSpeech,
    textareaRef,
    playFromPosition,
    pause,
    stop,
    skipParagraph
  } = useSpeechSynthesis(text, setText);

  // Sincroniza o texto extraído do PDF para dentro do hook do Speech
  useEffect(() => {
    if (text && textareaRef.current) {
      textareaRef.current.value = text;
    }
  }, [text]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      extractTextFromPdf(file);
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#93c5fd' }}>🔊 Leitor de Texto e PDF</h2>

        {/* Upload de arquivo */}
        <label htmlFor="pdfInput" style={{ display: 'block', width: '100%', padding: '12px', background: '#334155', color: 'white', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', marginBottom: '10px', fontWeight: '600', border: '2px dashed #475569' }}>
          {isProcessing ? '⏳ Processando PDF...' : '📁 Selecionar arquivo PDF'}
        </label>
        <input type="file" id="pdfInput" accept="application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
        <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '0.8rem', color: '#94a3b8' }}>
          {fileName}
        </div>

        {/* Campo de Texto */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cole seu texto aqui ou carregue um PDF..."
          style={{ width: '100%', height: '200px', background: '#0f172a', color: 'white', padding: '12px', border: '2px solid #334155', borderRadius: '8px', marginBottom: '1rem', resize: 'vertical' }}
        />

        {/* 💬 Balão de Pensamento/Fala da IA da Ayla Inserido com Sucesso */}
        {aylaSpeech && (
          <div style={{
            background: '#334155',
            borderLeft: '4px solid #93c5fd',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontStyle: 'italic',
            color: '#93c5fd',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <strong>Ayla diz:</strong> "{aylaSpeech}"
          </div>
        )}

        {/* Controles de Áudio */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => textareaRef.current && playFromPosition(textareaRef.current.selectionStart)}
            style={{ padding: '12px', flex: '1', minWidth: '150px', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', fontWeight: '600', background: isPlaying ? '#10b981' : '#3b82f6' }}
          >
            {isPlaying ? '🎙️ Agente Lendo...' : '▶️ Reproduzir do Cursor'}
          </button>
          <button onClick={skipParagraph} style={{ padding: '12px', flex: '1', minWidth: '150px', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', fontWeight: '600', background: '#8b5cf6' }}>
            ⏭️ Pular Parágrafo
          </button>
          <button onClick={pause} style={{ padding: '12px', flex: '1', minWidth: '150px', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', fontWeight: '600', background: '#64748b' }}>
            ⏸️ Pausar / Retomar
          </button>
          <button onClick={stop} style={{ padding: '12px', flex: '1', minWidth: '150px', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', fontWeight: '600', background: '#ef4444' }}>
            ⏹️ Parar
          </button>
        </div>

        {/* Status */}
        <div style={{ padding: '12px', background: '#0f172a', borderRadius: '8px', textAlign: 'center', border: '1px solid #334155', fontSize: '0.9rem', fontWeight: 'bold' }}>
          Status: {status}
        </div>
      </div>
    </div>
  );
}

export default App;