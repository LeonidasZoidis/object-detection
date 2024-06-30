import { useEffect, useRef, useState } from 'react';
import {
    Button,
    Box,
    CircularProgress,
    Grid,
    Typography,
    Container,
} from '@mui/material';
import { DetectionResult } from '../apiDataInterface';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const Form = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [data, setData] = useState<DetectionResult[] | null>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [imageSrc, setImageSrc] = useState<string>('');
    const [showCanvas, setShowCanvas] = useState(false);
    const [focusedObject, setFocusedObject] = useState<number | null>(null);
    const [imageURL, setImageURL] = useState<string>('');
    const [showURLInput, setShowURLInput] = useState(false);

    const handleUploadClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];

            // file type check
            if (!['image/jpeg', 'image/png'].includes(file.type)) {
                setError(
                    'Invalid file type. Please select a JPEG or PNG image.'
                );
                setSelectedFile(null);
                return;
            }

            // file size check
            if (file.size > 2 * 1024 * 1024) {
                // 2 MB limit
                setError('File size exceeds 2 MB limit.');
                setSelectedFile(null);
                return;
            }

            // image dimensions check
            const img = new Image();
            img.onload = () => {
                if (img.width > 2000 || img.height > 2000) {
                    setError('Image dimensions exceed 2000 x 2000 pixels.');
                    setSelectedFile(null);
                } else {
                    setSelectedFile(null); // clear previous file selection
                    setSelectedFile(file);
                    setImageSrc(URL.createObjectURL(file));
                    setError(null);
                    setShowCanvas(false); // ensure image is displayed
                    if (fileInputRef.current) fileInputRef.current.value = ''; // clear the input value
                }
            };
            img.src = URL.createObjectURL(file);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            setLoading(true);
            setUploadStatus(null);
            setError(null);

            const res = await fetch(
                'https://api.api-ninjas.com/v1/objectdetection',
                {
                    method: 'POST',
                    headers: {
                        'X-Api-Key': import.meta.env.VITE_API_KEY,
                    },
                    body: formData,
                    mode: 'cors',
                }
            );
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Upload failed: ${res.status} - ${errorText}`);
            }

            const apiData: DetectionResult[] = await res.json();
            setData(apiData);
            setUploadStatus('Image analysed successfully');
            setShowCanvas(true); // show the canvas after processing
        } catch (error: any) {
            setError(error.message);
            setUploadStatus(`Upload failed: ${error.message}`);
        } finally {
            setLoading(false);
            setSelectedFile(null);
        }
    };

    const handleURLUpload = async () => {
        if (!imageURL) return;

        try {
            setLoading(true);
            setUploadStatus(null);
            setError(null);
            setSelectedFile(null); // clear selectedFile when handling url

            const res = await fetch(imageURL);
            if (!res.ok) {
                throw new Error(`Image fetch failed: ${res.status}`);
            }

            const blob = await res.blob();
            const file = new File([blob], 'uploaded_image.jpg', {
                type: blob.type,
            });

            setSelectedFile(file);
            setImageSrc(URL.createObjectURL(file));

            // continue with file upload logic
            const formData = new FormData();
            formData.append('image', file);

            const apiRes = await fetch(
                'https://api.api-ninjas.com/v1/objectdetection',
                {
                    method: 'POST',
                    headers: {
                        'X-Api-Key': import.meta.env.VITE_API_KEY,
                    },
                    body: formData,
                    mode: 'cors',
                }
            );

            if (!apiRes.ok) {
                const errorText = await apiRes.text();
                throw new Error(
                    `Upload failed: ${apiRes.status} - ${errorText}`
                );
            }

            const apiData: DetectionResult[] = await apiRes.json();
            setData(apiData);
            setUploadStatus('Image analysed successfully');
            setShowCanvas(true); // show canvas after processing complete
        } catch (error: any) {
            setError(error.message);
            setUploadStatus(`Upload failed: ${error.message}`);
        } finally {
            setLoading(false);
            setSelectedFile(null);
        }
    };

    useEffect(() => {
        if (data && canvasRef.current && imageSrc) {
            const img = new Image();
            img.onload = () => {
                drawImageOnCanvas(img);
                drawBoundingBoxes(data, focusedObject);
            };
            img.src = imageSrc;
        }
    }, [data, imageSrc, focusedObject]);

    const drawImageOnCanvas = (img: HTMLImageElement) => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            // clear the canvas
            ctx?.clearRect(0, 0, canvas.width, canvas.height);

            // set canvas to match the image size
            canvas.width = img.width;
            canvas.height = img.height;

            // draw the image on the canvas
            ctx?.drawImage(img, 0, 0);
        }
    };

    const drawBoundingBoxes = (
        data: DetectionResult[],
        focusedObject: number | null
    ) => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    data.forEach((item, index) => {
                        if (focusedObject !== null && focusedObject !== index) {
                            return;
                        }
                        const { x1, y1, x2, y2 } = item.bounding_box;
                        const color = getRandomColor();
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(
                            parseInt(x1),
                            parseInt(y1),
                            parseInt(x2) - parseInt(x1),
                            parseInt(y2) - parseInt(y1)
                        );

                        // calculate the widest text to determine background width
                        const textWidth =
                            Math.max(
                                ctx.measureText(`Object ${index + 1}`).width,
                                ctx.measureText(`Label: ${item.label}`).width,
                                ctx.measureText(
                                    `Confidence: ${item.confidence}`
                                ).width
                            ) + 10; // padding

                        // determine text position to keep it within the canvas
                        let textX = parseInt(x1);
                        let textY = parseInt(y1) - 55; // height to capture all text
                        if (textY < 0) {
                            textY = parseInt(y1) + 10; // move below the bounding box if too high
                        }
                        if (textX + textWidth > canvas.width) {
                            textX = canvas.width - textWidth - 10; // adjust if text goes beyond the canvas width
                        }

                        // draw background rectangle for all text
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // bg color
                        ctx.fillRect(textX, textY, textWidth, 55);

                        // draw text with stroke for better visibility
                        ctx.font = 'bold 16px Arial';
                        ctx.lineWidth = 3;
                        ctx.strokeStyle = 'black'; // stroke color

                        // stroke text
                        ctx.strokeText(
                            `Object ${index + 1}`,
                            textX + 5,
                            textY + 15
                        );
                        ctx.strokeText(
                            `Label: ${item.label}`,
                            textX + 5,
                            textY + 30
                        );
                        ctx.strokeText(
                            `Confidence: ${item.confidence}`,
                            textX + 5,
                            textY + 45
                        );

                        // fill text
                        ctx.fillStyle = 'white';
                        ctx.fillText(
                            `Object ${index + 1}`,
                            textX + 5,
                            textY + 15
                        );
                        ctx.fillText(
                            `Label: ${item.label}`,
                            textX + 5,
                            textY + 30
                        );
                        ctx.fillText(
                            `Confidence: ${item.confidence}`,
                            textX + 5,
                            textY + 45
                        );
                    });
                };
                img.src = imageSrc;
            }
        }
    };

    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };

    return (
        <Container maxWidth="md">
            <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                mt={4}
            >
                <Typography variant="h4" component="h1" gutterBottom>
                    Object Detection App
                </Typography>
                <Typography variant="body1" gutterBottom>
                    Select an image file to upload or enter an image URL to
                    analyze. The app will detect objects within the image and
                    display bounding boxes around them.
                </Typography>

                <Box display="flex" justifyContent="center" mt={2}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            setImageSrc(null);
                            setData(null);
                            setError(null);
                            setUploadStatus(null);
                            setSelectedFile(null); // clear selectedFile when selecting image
                            fileInputRef.current?.click();
                            setShowURLInput(false); // hide url input when selecting image
                        }}
                        sx={{ mr: 2 }}
                    >
                        Select Image
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            setImageURL('');
                            setImageSrc(null);
                            setData(null);
                            setError(null);
                            setUploadStatus(null);
                            setSelectedFile(null); // clear selectedFile when entering url
                            setShowURLInput(true); // show url input when clicking to enter url
                        }}
                    >
                        Enter Image URL
                    </Button>
                </Box>

                {showURLInput && (
                    <Box
                        mt={2}
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                    >
                        {/*  */}
                        <input
                            type="text"
                            value={imageURL} // ensure value is always a string
                            onChange={(e) => setImageURL(e.target.value)}
                            placeholder="Enter image URL"
                            style={{
                                width: '300px',
                                padding: '10px',
                                fontSize: '16px',
                                marginBottom: '10px', // margin to separate input and button
                            }}
                        />
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleURLUpload}
                        >
                            Analyze URL Image
                        </Button>
                    </Box>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    key={selectedFile ? selectedFile.name : ''}
                    onChange={handleUploadClick}
                />

                {selectedFile && !showURLInput && (
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleFileUpload}
                        sx={{ mt: 2 }}
                    >
                        Upload and Analyze Image
                    </Button>
                )}

                {loading && (
                    <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        mt={4}
                    >
                        <CircularProgress />
                    </Box>
                )}

                {error && (
                    <Typography color="error" mt={2}>
                        {error}
                    </Typography>
                )}

                {uploadStatus && (
                    <Box display="flex" alignItems="center" mt={2}>
                        {uploadStatus === 'Image analysed successfully' && (
                            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                        )}
                        <Typography color="primary">{uploadStatus}</Typography>
                    </Box>
                )}

                {imageSrc && !showCanvas && (
                    <Box
                        mt={4}
                        width="100%"
                        display="flex"
                        justifyContent="center"
                    >
                        <img
                            src={imageSrc}
                            alt="Selected"
                            style={{
                                maxWidth: '100%',
                                border: '1px solid black',
                            }}
                        />
                    </Box>
                )}

                {showCanvas && (
                    <Box
                        mt={4}
                        width="100%"
                        display="flex"
                        justifyContent="center"
                    >
                        <canvas
                            ref={canvasRef}
                            style={{
                                border: '1px solid black',
                                maxWidth: '100%',
                            }}
                        />
                    </Box>
                )}

                {data && (
                    <Box
                        mt={4}
                        width="100%"
                        display="flex"
                        justifyContent="center"
                        style={{ maxHeight: '400px', overflowY: 'auto' }}
                    >
                        <Grid container spacing={2}>
                            {data.map((item, index) => (
                                <Grid item xs={12} sm={6} key={index}>
                                    <Box
                                        p={2}
                                        border={1}
                                        borderColor="grey.300"
                                        borderRadius={2}
                                        onClick={() => {
                                            setFocusedObject(index);
                                            setShowCanvas(true); // ensure the canvas is displayed
                                        }}
                                        style={{
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <Typography variant="h6">
                                            Object {index + 1}
                                        </Typography>
                                        <Typography>
                                            Label: {item.label}
                                        </Typography>
                                        <Typography>
                                            Confidence: {item.confidence}
                                        </Typography>
                                        <Typography>
                                            Bounding Box: (
                                            {item.bounding_box.x1},{' '}
                                            {item.bounding_box.y1}), (
                                            {item.bounding_box.x2},{' '}
                                            {item.bounding_box.y2})
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}
            </Box>
        </Container>
    );
};

export default Form;
