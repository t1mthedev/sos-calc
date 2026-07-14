import { useState } from 'react';
import ImageIcon from '@mui/icons-material/Image';

export function MaterialIcon({ materialKey }: { materialKey: string }) {
  const [failed, setFailed] = useState<'webp' | 'jpg'>();
  if (failed === 'jpg') return <ImageIcon sx={{ fontSize: 28, color: 'text.disabled' }} />;
  const ext = failed === 'webp' ? 'jpg' : 'webp';
  return (
    <img
      src={`/materials/${encodeURIComponent(materialKey)}.${ext}`}
      alt={materialKey}
      width={32}
      height={35}
      style={{ display: 'block' }}
      onError={() => setFailed(ext as 'webp' | 'jpg')}
    />
  );
}
