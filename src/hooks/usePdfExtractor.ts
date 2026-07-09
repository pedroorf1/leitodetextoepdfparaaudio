import { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';

// IMPORTAÇÃO NATIVA DO VITE: O próprio Vite cria um chunk de Worker isolado
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Define o link do worker local gerado pelo empacotador
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export const usePdfExtractor = () => {
  const [text, setText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('Nenhum arquivo selecionado');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const extractTextFromPdf = async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        // Mapeia e junta os blocos textuais da página de forma segura
        const pageText = content.items
          .map((item: any) => item.str || '')
          .join(' ');

        fullText += pageText + '\n';
      }

      setText(fullText);
    } catch (error) {
      console.error('Erro ao extrair PDF:', error);
      alert('Falha ao ler o arquivo PDF. Verifique se o documento não está corrompido.');
    } finally {
      setIsProcessing(false);
    }
  };

  return { text, setText, fileName, isProcessing, extractTextFromPdf };
};