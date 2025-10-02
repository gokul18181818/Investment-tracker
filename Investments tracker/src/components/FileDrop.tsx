import React from 'react';
import { useDropzone } from 'react-dropzone';
import './FileDrop.css';

interface Props {
  onFiles: (files: File[]) => void;
}

export default function FileDrop({ onFiles }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  });

  return (
    <div {...getRootProps({ className: 'dropzone' + (isDragActive ? ' active' : '') })}>
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here ...</p>
      ) : (
        <p>Drag & drop PDF/image pay stubs here, or click to select files</p>
      )}
    </div>
  );
} 