
'use client';

import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, storage } from '@/lib/firebase';
import Image from 'next/image';

interface ImageUploaderProps {
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  userId: string | null | undefined;
  label?: string;
}

export function ImageUploader({ imageUrl, onImageUrlChange, userId, label = "Image" }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
        return;
    }
    if (!userId) {
        toast({ title: 'You must be logged in to upload images.', variant: 'destructive' });
        return;
    }

    setIsUploading(true);
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("You must be logged in to upload images.");
        }
        const idToken = await user.getIdToken();

        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed.');
        }
        
        const data = await response.json();
        const downloadURL = data.imageUrl;

        // Delete old image if one existed
        if (imageUrl && imageUrl.includes('firebasestorage.googleapis.com')) {
          try {
            const oldImageRef = ref(storage, imageUrl);
            await deleteObject(oldImageRef);
          } catch (error: any) {
              if (error.code !== 'storage/object-not-found') {
                  console.warn("Could not delete old image, it might not exist:", error);
              }
          }
        }
        
        onImageUrlChange(downloadURL);
        toast({ title: 'Image Uploaded' });

    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;
     if (imageUrl.includes('firebasestorage.googleapis.com')) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
                console.warn("Could not delete image, it might not exist:", error);
                // Don't toast an error if delete fails, just clear the UI
            }
        }
     }
    onImageUrlChange('');
    toast({ title: 'Image Removed' });
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input placeholder="Image URL (or upload)" value={imageUrl} onChange={(e) => onImageUrlChange(e.target.value)} />
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading || !userId}>
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Upload Image
        </Button>
        <Input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
        {imageUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage} className="text-destructive hover:text-destructive">
                <X className="mr-2 h-4 w-4" />
                Remove
            </Button>
        )}
      </div>
      {imageUrl && (
        <div className="mt-2 relative w-full aspect-video rounded-md overflow-hidden border bg-muted">
            <Image src={imageUrl} alt="Image preview" layout="fill" objectFit="cover" />
        </div>
      )}
    </div>
  );
}
