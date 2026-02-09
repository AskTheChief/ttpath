
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
import { randomUUID } from 'crypto';

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
      // 1. Delete old image if it exists in Firebase Storage
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

      // 2. Create a unique filename for the new image
      const fileExtension = file.name.split('.').pop();
      const uniqueFilename = `${userId}/${Date.now()}.${fileExtension}`;
      const newImageRef = ref(storage, `images/${uniqueFilename}`);
      
      // 3. Upload the file using the client-side SDK
      const snapshot = await uploadBytes(newImageRef, file);

      // 4. Get the public URL for the uploaded file
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 5. Update the parent component's state with the new URL
      onImageUrlChange(downloadURL);
      toast({ title: 'Image Uploaded' });

    } catch (error: any) {
      console.error("Upload Failed:", error);
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

    // Only try to delete if it's a Firebase Storage URL
     if (imageUrl.includes('firebasestorage.googleapis.com')) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
                console.warn("Could not delete image, it might not exist:", error);
                 toast({
                    variant: "destructive",
                    title: "Could not delete old image",
                    description: "The image may have already been removed. Proceeding to clear the reference.",
                });
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
            <Image src={imageUrl} alt="Image preview" fill sizes="100vw" style={{ objectFit: 'cover' }} />
        </div>
      )}
    </div>
  );
}
