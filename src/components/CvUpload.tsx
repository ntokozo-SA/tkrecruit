import { useRef, useState, type DragEvent } from 'react';
import { CV_ACCEPT } from '../lib/profile';
import { FileIcon, UploadIcon } from './Icons';

interface CvUploadProps {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  invalid: boolean;
  describedBy?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CvUpload({ id, file, onChange, invalid, describedBy }: CvUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) onChange(dropped);
  }

  function clear() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className={`cv${invalid ? ' cv--invalid' : ''}`}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={CV_ACCEPT}
        className="visually-hidden"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="cv__file">
          <FileIcon className="cv__file-icon" width={20} height={20} />
          <div className="cv__file-meta">
            <span className="cv__file-name">{file.name}</span>
            <span className="cv__file-size">{formatSize(file.size)}</span>
          </div>
          <div className="cv__file-actions">
            <button type="button" className="button button--secondary button--small" onClick={() => inputRef.current?.click()}>
              Replace
            </button>
            <button type="button" className="button button--ghost button--small" onClick={clear}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={`cv__drop${dragging ? ' cv__drop--active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <UploadIcon width={20} height={20} />
          <span className="cv__drop-title">
            <span className="cv__drop-link">Choose a file</span> or drag it here
          </span>
          <span className="cv__drop-meta">PDF, DOC or DOCX, up to 5 MB</span>
        </label>
      )}
    </div>
  );
}
