import React from 'react';
import BoxCard from './boxCard';
import { Box } from '@/firebase/dbOp'; // Import the Box interface from dbOp

interface BoxListProps {
  boxes: Box[];
  onViewDetails: (box: Box) => void;
  onDeleteBox: (boxId: string) => void;
}

const BoxList: React.FC<BoxListProps> = ({ boxes, onViewDetails, onDeleteBox }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {boxes.map(box => (
        <BoxCard
          key={box.id}
          box={box}
          onViewDetails={() => onViewDetails(box)}
          onDeleteBox={() => onDeleteBox(box.id)}
        />
      ))}
    </div>
  );
};

export default BoxList;