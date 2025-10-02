import React from 'react';
import { StoredFile } from '../App';
import './PaystubLibrary.css';

interface Props {
  files: StoredFile[];
}

export default function PaystubLibrary({ files }: Props) {
  if (files.length === 0) return null;

  const toDataUrl = (file: StoredFile) => `data:${file.mime};base64,${file.data}`;

  return (
    <div className="paystub-card">
      <h2>Paystub Library</h2>
      <ul>
        {files.map(f => (
          <li key={f.id}>
            <span>{f.name}</span>
            <a href={toDataUrl(f)} target="_blank" rel="noopener noreferrer">
              View
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
} 