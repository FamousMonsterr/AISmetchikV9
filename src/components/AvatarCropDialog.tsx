// src/components/AvatarCropDialog.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface AvatarCropDialogProps {
  isOpen: boolean;
  file: File | null;
  onClose: () => void;
  onConfirm: (file: File) => void;
}

const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImage = async (imageSrc: string, crop: Area) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Не удалось создать canvas.');
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Не удалось подготовить изображение.'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.92);
  });
};

export function AvatarCropDialog({ isOpen, file, onClose, onConfirm }: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const imageUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!file || !imageUrl || !croppedAreaPixels) return;
    const blob = await getCroppedImage(imageUrl, croppedAreaPixels);
    const croppedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '-avatar.jpg', {
      type: 'image/jpeg',
    });
    onConfirm(croppedFile);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Обрезать аватар</DialogTitle>
          <DialogDescription>Выберите область, которая будет отображаться.</DialogDescription>
        </DialogHeader>
        <div className="relative h-64 w-full overflow-hidden rounded-md border bg-muted">
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropShape="round"
              showGrid={false}
            />
          )}
        </div>
        <div className="space-y-2">
          <Label>Масштаб</Label>
          <Slider
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={(value) => setZoom(value[0])}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleConfirm} disabled={!croppedAreaPixels}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
