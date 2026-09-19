import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
  Plus,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { uploadToCloudinary } from "@/services/cloudinary";
import { toast } from "sonner";

interface CloudinaryUploadProps {
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  name?: string;
  label?: string;
  required?: boolean;
  maxSizeMB?: number;
}

export function CloudinaryUpload({
  value = "",
  onChange,
  multiple = false,
  name,
  label,
  required = false,
  maxSizeMB = 5,
}: CloudinaryUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cast value to appropriate types
  const singleValue = typeof value === "string" ? value : "";
  const multiValues = Array.isArray(value)
    ? value
    : value
      ? (value as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  // Synchronize internal state with Cloudinary configuration check
  const isCloudinaryConfigured = !!(
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFiles(e.target.files);
    }
  };

  const validateFile = (file: File): string | null => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return `Unsupported file format: ${file.name}. Please upload JPG, PNG or WEBP.`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File ${file.name} exceeds the maximum size limit of ${maxSizeMB}MB.`;
    }
    return null;
  };

  const processFiles = async (fileList: FileList) => {
    if (!isCloudinaryConfigured) {
      const err =
        "Cloudinary is not configured. Environment variables VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET are missing.";
      setError(err);
      toast.error(err);
      return;
    }

    setError(null);
    const filesArray = Array.from(fileList);

    if (multiple) {
      setUploading(true);
      setProgress(0);
      const newUrls: string[] = [...multiValues];
      let hasError = false;

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          toast.error(validationError);
          hasError = true;
          continue;
        }

        try {
          // Track progress for current file out of total files
          const url = await uploadToCloudinary(file, (p) => {
            const overallProgress = Math.round(((i + p / 100) / filesArray.length) * 100);
            setProgress(overallProgress);
          });
          newUrls.push(url);
        } catch (err: any) {
          const errMsg = err.message || "Failed to upload file.";
          setError(errMsg);
          toast.error(errMsg);
          hasError = true;
        }
      }

      setUploading(false);
      setProgress(100);
      onChange(newUrls);
      if (!hasError) {
        toast.success("All images uploaded successfully!");
      }
    } else {
      // Single file upload
      const file = filesArray[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        toast.error(validationError);
        return;
      }

      setUploading(true);
      setProgress(0);
      try {
        const url = await uploadToCloudinary(file, setProgress);
        setUploading(false);
        onChange(url);
        toast.success("Image uploaded successfully!");
      } catch (err: any) {
        setUploading(false);
        const errMsg = err.message || "Failed to upload file.";
        setError(errMsg);
        toast.error(errMsg);
      }
    }
  };

  const removeSingleImage = () => {
    onChange("");
    setError(null);
    toast.info("Image removed");
  };

  const removeMultiImage = (indexToRemove: number) => {
    const updated = multiValues.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
    toast.info("Image removed");
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2.5 w-full text-left font-sans">
      {label && (
        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Hidden input for HTML Form submissions */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={multiple ? multiValues.join(", ") : singleValue}
          required={required && (multiple ? multiValues.length === 0 : !singleValue)}
        />
      )}

      {/* Cloudinary environment verification warning */}
      {!isCloudinaryConfigured && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs rounded-xl flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Cloudinary variables are not configured in environment. File inputs will fail.
          </span>
        </div>
      )}

      {/* Drag & Drop Zone / Preview States */}
      {!multiple && singleValue ? (
        /* SINGLE IMAGE PREVIEW STATE */
        <div className="relative group rounded-2xl border border-border bg-card/40 backdrop-blur-md overflow-hidden aspect-video max-h-56 flex items-center justify-center shadow-sm">
          <img
            src={singleValue}
            alt="Preview"
            className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={triggerFileInput}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-transform hover:scale-105 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Replace Image"
            >
              <RefreshCw className="h-4 w-4" /> Replace
            </button>
            <button
              type="button"
              onClick={removeSingleImage}
              className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg transition-transform hover:scale-105 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Remove Image"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          </div>
        </div>
      ) : multiple && multiValues.length > 0 ? (
        /* MULTIPLE IMAGES GRID + MINI DROPZONE STATE */
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {multiValues.map((imgUrl, index) => (
              <div
                key={index}
                className="relative group rounded-xl border border-border bg-card/40 backdrop-blur-md overflow-hidden aspect-square flex items-center justify-center shadow-sm"
              >
                <img
                  src={imgUrl}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                <button
                  type="button"
                  onClick={() => removeMultiImage(index)}
                  className="absolute top-2 right-2 p-1.5 bg-rose-600/90 hover:bg-rose-750 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer"
                  title="Remove Image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Add More Button inside grid */}
            {!uploading && (
              <button
                type="button"
                onClick={triggerFileInput}
                className="border-2 border-dashed border-border/80 hover:border-accent bg-card/10 hover:bg-accent/5 rounded-xl aspect-square flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
              >
                <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-accent/15 group-hover:text-accent transition-colors">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-accent">
                  Add Photo
                </span>
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* DROPZONE INPUT (Visible when single has no value, or multiple is empty, or during uploads) */}
      {(!multiple && !singleValue) || (multiple && multiValues.length === 0) || uploading ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={uploading ? undefined : triggerFileInput}
          className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden select-none ${
            uploading
              ? "border-indigo-500 bg-indigo-500/5 cursor-default"
              : dragActive
                ? "border-indigo-500 bg-indigo-500/5 scale-[0.99]"
                : "border-border hover:border-indigo-500/50 bg-card/20 hover:bg-card/40 cursor-pointer"
          }`}
        >
          {uploading ? (
            /* UPLOADING STATE OVERLAY */
            <div className="space-y-3 z-10 w-full px-8">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto" />
              <div className="space-y-1 text-center">
                <span className="text-xs font-bold text-indigo-500 block uppercase tracking-wider">
                  Uploading Image ({progress}%)
                </span>
                <div className="h-1.5 w-full max-w-[200px] mx-auto bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* DEFAULT DROPZONE STATE */
            <>
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="h-6 w-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Drag & Drop file here
              </h4>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                or click to browse from device (JPG, PNG, WEBP · Max {maxSizeMB}MB)
              </p>
            </>
          )}
        </div>
      ) : null}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Error message */}
      {error && (
        <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
