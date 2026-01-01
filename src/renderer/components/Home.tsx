import React from 'react';
import { FileOpener } from './FileOpener';
import { FolderOpener } from './FolderOpener';
import './Home.css';

interface HomeProps {
  onFileOpened: (filePath: string, content: string) => void;
  onFolderOpened: (folderPath: string) => void;
  onConnectRepository?: () => void;
}

export const Home: React.FC<HomeProps> = ({ onFileOpened, onFolderOpened, onConnectRepository }) => {
  return (
    <div className="welcome">
      <h1>Welcome to MarkRead</h1>
      <p>Open a markdown file or folder to get started</p>
      <div className="welcome-buttons">
        <FileOpener onFileOpened={onFileOpened} />
        <FolderOpener onFolderOpened={onFolderOpened} />
        {onConnectRepository && (
          <button type="button" className="connect-repo-button" onClick={onConnectRepository}>
            Connect to Repository
          </button>
        )}
      </div>
    </div>
  );
};
