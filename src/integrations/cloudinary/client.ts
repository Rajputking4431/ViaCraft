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
  // 1. Validation & Resource Type Detection
  const isVideo = file.type.startsWith("video/");
  const isPdfOrDocument =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf") ||
    file.type.startsWith("application/");

  let resourceType: "video" | "image" | "raw" = "image";

  if (isVideo) {
    resourceType = "video";
    const validVideoTypes = [
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/ogg",
      "video/mpeg",
    ];
    if (!validVideoTypes.includes(file.type)) {
      throw new Error(
        `Unsupported video type: ${file.name}. Only MP4, MOV, WEBM, OGG, and MPEG formats are supported.`,
      );
    }

    const maxVideoSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxVideoSize) {
      throw new Error(`Video ${file.name} is too large. Maximum size is 25MB.`);
    }
  } else if (isPdfOrDocument) {
    resourceType = "raw";
    const maxDocSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxDocSize) {
      throw new Error(`Document ${file.name} is too large. Maximum size is 10MB.`);
    }
  } else {
    resourceType = "image";
    const validImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!validImageTypes.includes(file.type.toLowerCase())) {
      throw new Error(
        `Unsupported image type: ${file.name}. Only JPG, PNG, WEBP, and PDF documents are supported.`,
      );
    }

    const maxImageSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxImageSize) {
      throw new Error(`Image ${file.name} is too large. Maximum size is 10MB.`);
    }
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
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);

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
