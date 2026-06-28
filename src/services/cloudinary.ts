import { toast } from "sonner";

/**
 * Uploads a file to Cloudinary using unsigned upload.
 * Ref: https://cloudinary.com/documentation/upload_images#unsigned_upload
 *
 * @param file The file object to upload
 * @param onProgress Optional callback to receive upload progress percentage (0-100)
 * @returns Promise resolving to the secure URL of the uploaded image
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  // 1. Validation
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new Error(
      `Unsupported file type: ${file.name}. Only JPG, PNG, and WEBP formats are supported.`,
    );
  }

  const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSizeInBytes) {
    throw new Error(`File ${file.name} is too large. Maximum size is 5MB.`);
  }

  // 2. Configuration check
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    const errorMsg =
      "Cloudinary is not configured. Please ensure VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET are set in your environment variables.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 3. Upload execution via XMLHttpRequest for tracking progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.secure_url) {
            resolve(response.secure_url);
          } else {
            reject(new Error("Cloudinary response did not include a secure URL."));
          }
        } catch (e) {
          reject(new Error("Failed to parse Cloudinary upload response."));
        }
      } else {
        try {
          const errJson = JSON.parse(xhr.responseText);
          reject(new Error(errJson.error?.message || `Upload failed with status ${xhr.status}`));
        } catch (e) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("A network error occurred while uploading file to Cloudinary."));
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    xhr.send(formData);
  });
}
