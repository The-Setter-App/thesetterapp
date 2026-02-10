import React from 'react';
import ArrowDown from './arrow-down.svg';

const ArrowDownIcon = (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <img src={ArrowDown} alt="Arrow Down" {...props} />
);

export default ArrowDownIcon;
