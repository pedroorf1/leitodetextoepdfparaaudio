import { useState, useRef } from 'react';

const API = import.meta.env.VITE_API_SOURCE;

export const useSpeechSynthesis = (
  text: string,
  setText: React.Dispatch<React.SetStateAction<string>>
) => {
  const [status, setStatus] = useState<string>('Pronto');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [aylaSpeech, setAylaSpeech] = useState<string>(''); // Texto que a IA gerou

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Controle de Fila por Parágrafos para o Agente
  const paragraphsQueueRef = useRef<string[]>([]);
  const currentParagraphIndexRef = useRef<number>(0);

  // Divide o PDF em parágrafos limpos
  const splitIntoParagraphs = (fullText: string): string[] => {
    return fullText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  };

  // 🤖 O CORAÇÃO DO AGENTE: Consome a LLM (Groq) e o TTS (Edge) integrados
  const playCurrentParagraph = async () => {
    const queue = paragraphsQueueRef.current;
    const index = currentParagraphIndexRef.current;

    if (index >= queue.length) {
      setStatus('⏹️ Fim da leitura do documento pelo Agente.');
      setIsPlaying(false);
      return;
    }

    const rawParagraph = queue[index];

    try {
      setStatus(`🧠 Ayla pensando e interpretando parágrafo ${index + 1}...`);

      // 🌐 Chamada para a API que unifica o seu conf.yaml (Groq + Edge TTS)
      // Substitua '/api/read-paragraph' pela URL do seu servidor local de MVP
      const response = await fetch(`${API}/tts/read-paragraph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraph: rawParagraph })
      });

      const data = await response.json();

      if (!response.ok || !data.audioUrl) {
        throw new Error("Falha na resposta da IA");
      }

      // Atualiza a tela com o que a IA interpretou e a expressão gerada
      setAylaSpeech(data.textoInterpretado);

      // Interrompe qualquer áudio remanescente
      if (audioRef.current) audioRef.current.pause();

      // Executa o áudio gerado pela IA da Ayla
      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setStatus(`🎙️ Ayla lendo parágrafo ${index + 1}...`);
        setIsPlaying(true);
      };

      // Quando terminar de falar este parágrafo, ela vai para o próximo automaticamente
      audio.onended = () => {
        currentParagraphIndexRef.current += 1;
        playCurrentParagraph();
      };

      await audio.play();

    } catch (error) {
      console.error('Erro no Agente de Leitura:', error);
      setStatus('⚠️ Erro de comunicação com o Groq/TTS. Pulando parágrafo...');
      currentParagraphIndexRef.current += 1;
      setTimeout(playCurrentParagraph, 1500);
    }
  };

  const playFromPosition = (startPos: number) => {
    const remainingText = text.substring(startPos);
    const paragraphs = splitIntoParagraphs(remainingText);

    if (paragraphs.length === 0) {
      setStatus('❌ Forneça um texto ou PDF válido.');
      return;
    }

    paragraphsQueueRef.current = paragraphs;
    currentParagraphIndexRef.current = 0;

    playCurrentParagraph();
  };

  const pause = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setStatus('🔊 Ayla retomou a leitura...');
    } else {
      audioRef.current.pause();
      setStatus('⏸️ Agente em pausa');
    }
  };

  const stop = () => {
    paragraphsQueueRef.current = [];
    currentParagraphIndexRef.current = 0;
    setIsPlaying(false);
    setAylaSpeech('');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setStatus('⏹️ Parado');
  };

  const skipParagraph = () => {
    if (!textareaRef.current) return;

    const currentPos = textareaRef.current.selectionStart;
    const remainingText = text.substring(currentPos);
    const nextLineIndex = remainingText.indexOf('\n');

    if (nextLineIndex !== -1) {
      const newPos = currentPos + nextLineIndex + 1;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newPos, newPos);
      playFromPosition(newPos);
    } else {
      setStatus('⚠️ Fim do documento.');
    }
  };

  return {
    status,
    isPlaying,
    aylaSpeech,
    textareaRef,
    playFromPosition,
    pause,
    stop,
    skipParagraph
  };
};