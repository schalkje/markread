/**
 * TitleBar Component
 * Task: T159
 *
 * Custom title bar with three sections:
 * - Left: Burger menu, menu bar, navigation buttons
 * - Middle: Active folder/file name
 * - Right: Theme toggle, search, download, window controls
 */

import React from 'react';
import { TitleBarLeft } from './TitleBarLeft';
import { TitleBarMiddle } from './TitleBarMiddle';
import { TitleBarRight } from './TitleBarRight';
import './TitleBar.css';

export const TitleBar: React.FC = () => {
  return (
    <div className="title-bar">
      <TitleBarLeft />
      <TitleBarMiddle />
      <TitleBarRight />
    </div>
  );
};
