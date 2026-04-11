import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

/**
 * INNOVATION: Photo Annotation Viewer Component
 * Displays annotations on images when viewing incident details
 * Read-only view of marked problem areas
 */
function AnnotationViewer({ imageUrl, annotations }) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !annotations) return;

    let disposed = false;

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: false,
      backgroundColor: '#ffffff',
      selection: false,
    });

    fabricCanvasRef.current = canvas;

    // Load image
    fabric.Image.fromURL(imageUrl, (img) => {
      // Guard: if canvas was disposed before image loaded, do nothing
      if (disposed) return;

      try {
        // Scale image to fit canvas — guard against missing dimensions
        const maxWidth = 500;
        const maxHeight = 400;
        const imgWidth = img.width || 500;
        const imgHeight = img.height || 400;
        const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
        
        img.scale(scale);
        canvas.setWidth(imgWidth * scale + 20);
        canvas.setHeight(imgHeight * scale + 20);
        
        img.set({ 
          left: 10, 
          top: 10, 
          selectable: false, 
          evented: false 
        });
        canvas.add(img);
        canvas.renderAll();

        // Load annotations
        if (annotations) {
          try {
            const annotationObjects = JSON.parse(annotations);
            annotationObjects.forEach(obj => {
              fabric.util.enlivenObjects([obj], (objects) => {
                if (disposed) return;
                objects.forEach(o => {
                  o.set({ selectable: false, evented: false });
                  canvas.add(o);
                });
              });
            });
            canvas.renderAll();
          } catch (e) {
            console.error('Error loading annotations:', e);
          }
        }
      } catch (err) {
        console.error('Error processing image in viewer:', err);
      }
    }, { crossOrigin: 'anonymous' });

    return () => {
      disposed = true;
      canvas.dispose();
    };
  }, [imageUrl, annotations]);

  if (!annotations) {
    return (
      <div style={{
        background: '#f9fafb',
        border: '2px solid #e5e7eb',
        borderRadius: 10,
        padding: 16,
        textAlign: 'center',
        color: '#6b7280',
      }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>No annotations on this image</p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#ffffff',
      border: '2px solid #d1d5db',
      borderRadius: 10,
      overflow: 'auto',
      maxHeight: '450px',
    }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}

export default AnnotationViewer;
