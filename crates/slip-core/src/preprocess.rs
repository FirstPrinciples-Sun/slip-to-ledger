//! Image preprocessing — grayscale, deskew, threshold, crop. Stub for D2-3.

use image::DynamicImage;

pub fn to_grayscale(img: &DynamicImage) -> DynamicImage {
    DynamicImage::ImageLuma8(img.to_luma8())
}

pub fn otsu_threshold(_img: &DynamicImage) -> DynamicImage {
    // TODO(D2): Otsu binarization
    todo!("D2: Otsu threshold")
}

pub fn deskew(_img: &DynamicImage) -> DynamicImage {
    // TODO(D2): Hough-line based deskew
    todo!("D2: deskew via Hough")
}
