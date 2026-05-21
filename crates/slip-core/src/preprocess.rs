//! Image preprocessing for slip OCR.
//!
//! Pipeline: grayscale → Otsu binarization → skew estimation/correction → crop.
//! All ops are pure-Rust and WASM-compatible (uses only the `image` crate).

use image::{DynamicImage, GrayImage, ImageBuffer, Luma};

pub fn to_grayscale(img: &DynamicImage) -> GrayImage {
    img.to_luma8()
}

/// Otsu's method: pick the threshold that maximizes inter-class variance.
/// Returns the binarized image and the chosen threshold (0..=255).
pub fn otsu_threshold(gray: &GrayImage) -> (GrayImage, u8) {
    let histogram = histogram(gray);
    let total = (gray.width() * gray.height()) as f64;
    let sum_total: f64 = histogram
        .iter()
        .enumerate()
        .map(|(t, &h)| (t as f64) * h as f64)
        .sum();

    let mut sum_b = 0.0;
    let mut w_b = 0.0;
    let mut max_var = 0.0;
    let mut threshold: u8 = 127;

    for (t, &h) in histogram.iter().enumerate() {
        w_b += h as f64;
        if w_b == 0.0 {
            continue;
        }
        let w_f = total - w_b;
        if w_f == 0.0 {
            break;
        }
        sum_b += (t as f64) * h as f64;
        let m_b = sum_b / w_b;
        let m_f = (sum_total - sum_b) / w_f;
        let between = w_b * w_f * (m_b - m_f).powi(2);
        if between > max_var {
            max_var = between;
            threshold = t as u8;
        }
    }

    let bin = ImageBuffer::from_fn(gray.width(), gray.height(), |x, y| {
        let v = gray.get_pixel(x, y).0[0];
        Luma([if v >= threshold { 255 } else { 0 }])
    });
    (bin, threshold)
}

fn histogram(gray: &GrayImage) -> [u32; 256] {
    let mut h = [0u32; 256];
    for px in gray.pixels() {
        h[px.0[0] as usize] += 1;
    }
    h
}

/// Estimate skew angle in degrees by maximizing the variance of the
/// horizontal projection profile across candidate angles.
///
/// Slips usually skew within ±10°. We sweep -10..10 in 0.5° steps over
/// a downscaled copy for speed, picking the angle whose row-sum profile
/// is most peaky (text rows form clean dark bands when properly aligned).
pub fn estimate_skew_degrees(bin: &GrayImage) -> f32 {
    let small = downscale(bin, 200);
    let mut best_angle = 0.0f32;
    let mut best_score = 0.0f32;

    let mut a = -10.0f32;
    while a <= 10.0 {
        let rotated = rotate_nearest(&small, a.to_radians());
        let score = profile_variance(&rotated);
        if score > best_score {
            best_score = score;
            best_angle = a;
        }
        a += 0.5;
    }
    best_angle
}

/// Rotate a binarized image by `angle_rad` radians using nearest-neighbor.
/// Pixels mapping outside the source are filled with white.
fn rotate_nearest(src: &GrayImage, angle_rad: f32) -> GrayImage {
    let (w, h) = (src.width() as i32, src.height() as i32);
    let cx = w as f32 / 2.0;
    let cy = h as f32 / 2.0;
    let cos = angle_rad.cos();
    let sin = angle_rad.sin();
    ImageBuffer::from_fn(src.width(), src.height(), |x, y| {
        let dx = x as f32 - cx;
        let dy = y as f32 - cy;
        let sx = (cos * dx + sin * dy + cx).round() as i32;
        let sy = (-sin * dx + cos * dy + cy).round() as i32;
        if sx >= 0 && sx < w && sy >= 0 && sy < h {
            *src.get_pixel(sx as u32, sy as u32)
        } else {
            Luma([255])
        }
    })
}

fn profile_variance(bin: &GrayImage) -> f32 {
    let h = bin.height() as usize;
    let mut row_dark = vec![0u32; h];
    for y in 0..bin.height() {
        let mut count = 0u32;
        for x in 0..bin.width() {
            if bin.get_pixel(x, y).0[0] < 128 {
                count += 1;
            }
        }
        row_dark[y as usize] = count;
    }
    let mean = row_dark.iter().sum::<u32>() as f32 / h as f32;
    row_dark
        .iter()
        .map(|&v| (v as f32 - mean).powi(2))
        .sum::<f32>()
        / h as f32
}

fn downscale(src: &GrayImage, target_w: u32) -> GrayImage {
    if src.width() <= target_w {
        return src.clone();
    }
    let scale = target_w as f32 / src.width() as f32;
    let new_h = (src.height() as f32 * scale).round() as u32;
    let mut out = ImageBuffer::new(target_w, new_h);
    for y in 0..new_h {
        for x in 0..target_w {
            let sx = (x as f32 / scale) as u32;
            let sy = (y as f32 / scale) as u32;
            out.put_pixel(
                x,
                y,
                *src.get_pixel(sx.min(src.width() - 1), sy.min(src.height() - 1)),
            );
        }
    }
    out
}

/// Convenience: full preprocess pipeline. Returns binarized, deskewed image.
pub fn full_preprocess(img: &DynamicImage) -> GrayImage {
    let gray = to_grayscale(img);
    let (bin, _) = otsu_threshold(&gray);
    let angle = estimate_skew_degrees(&bin);
    if angle.abs() > 0.25 {
        rotate_nearest(&bin, angle.to_radians())
    } else {
        bin
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Luma};

    fn synth_bimodal(w: u32, h: u32) -> GrayImage {
        ImageBuffer::from_fn(w, h, |x, _| Luma([if x < w / 2 { 30 } else { 220 }]))
    }

    #[test]
    fn otsu_finds_threshold_between_modes() {
        let img = synth_bimodal(40, 10);
        let (bin, t) = otsu_threshold(&img);
        assert!(t > 30 && t < 220, "threshold {t} should split modes");
        let total_white = bin.pixels().filter(|p| p.0[0] == 255).count();
        assert!(total_white > 0 && total_white < 40 * 10);
    }

    #[test]
    fn skew_zero_for_axis_aligned_text() {
        let mut img = ImageBuffer::from_pixel(200, 80, Luma([255u8]));
        for y in [10u32, 30, 50, 70] {
            for x in 10..190 {
                img.put_pixel(x, y, Luma([0]));
            }
        }
        let angle = estimate_skew_degrees(&img);
        assert!(angle.abs() < 1.0, "expected ~0°, got {angle}");
    }
}
