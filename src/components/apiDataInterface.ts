export interface BoundingBox {
    x1: string;
    y1: string;
    x2: string;
    y2: string;
}

export interface DetectionResult {
    label: string;
    confidence: string;
    bounding_box: BoundingBox;
}
