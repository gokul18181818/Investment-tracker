import { useRef, useState, useEffect } from 'react';
import { parsePaystub } from '../utils/parsePaystub';

const App: React.FC = () => {
  const [files, setFiles] = useState<StoredFile[]>([]);

  useEffect(() => {
    saveFiles(files).catch(console.error);
  }, [files]);

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default App;

// helper remains for fileUrlById if needed
function base64ToBlob(b64: string, mime: string) {
  const byteChars = atob(b64);
  const byteNumbers = new Array(byteChars.length)
    .fill(0)
    .map((_, i) => byteChars.charCodeAt(i));
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mime });
} 