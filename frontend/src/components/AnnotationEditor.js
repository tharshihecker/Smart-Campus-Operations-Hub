import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import './AnnotationEditor.css';

/**
 * INNOVATION: Photo Annotation Editor Component
 * Allows users to mark/annotate problem areas on images using Fabric.js
 * Supports circles, rectangles, text labels, and freehand drawing
 */
function AnnotationEditor({ imageUrl, onSave, onCancel, existingAnnotations }) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [drawingMode, setDrawingMode] = useState('circle');
  const [color, setColor] = useState('#dc2626'); // Red by default
  const [isSaving, setIsSaving] = useState(false);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: false,
      backgroundColor: '#ffffff',
      width: 620,
      height: 520,
    });

    fabricCanvasRef.current = canvas;

    // Load image
    fabric.Image.fromURL(imageUrl, (img) => {
      try {
        // Scale image to fit canvas
        const maxWidth = 600;
        const maxHeight = 500;
        const imgWidth = img.width || 600;
        const imgHeight = img.height || 500;
        const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
        
        img.scale(scale);
        img.set({ left: 10, top: 10, selectable: false, evented: false });
        canvas.add(img);
        canvas.renderAll();

        // Load existing annotations if any
        if (existingAnnotations) {
          try {
            const annotations = JSON.parse(existingAnnotations);
            if (Array.isArray(annotations) && annotations.length > 0) {
              fabric.util.enlivenObjects(annotations, (objects) => {
                objects.forEach(o => canvas.add(o));
                canvas.renderAll();
              });
            }
          } catch (e) {
            console.error('Error loading annotations:', e);
          }
        }
      } catch (err) {
        console.error('Error processing image:', err);
      }
    }, { crossOrigin: 'anonymous' }, { disableCoords: false });

    // Handle drawing mode
    canvas.on('mouse:down', (e) => {
      if (drawingMode === 'draw') {
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = 3;
      }
    });

    canvas.on('mouse:up', () => {
      canvas.isDrawingMode = false;
    });

    return () => {
      canvas.dispose();
    };
  }, [imageUrl, existingAnnotations]);

  // Add circle annotation
  const addCircle = () => {
    if (!fabricCanvasRef.current) return;
    const circle = new fabric.Circle({
      radius: 30,
      fill: 'transparent',
      stroke: color,
      strokeWidth: 2,
      left: 100,
      top: 100,
    });
    fabricCanvasRef.current.add(circle);
    fabricCanvasRef.current.renderAll();
  };

  // Add rectangle annotation
  const addRectangle = () => {
    if (!fabricCanvasRef.current) return;
    const rect = new fabric.Rect({
      width: 80,
      height: 60,
      fill: 'transparent',
      stroke: color,
      strokeWidth: 2,
      left: 100,
      top: 100,
    });
    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.renderAll();
  };

  // Add text label
  const addText = () => {
    if (!fabricCanvasRef.current) return;
    const text = new fabric.IText('Label', {
      left: 100,
      top: 100,
      fontSize: 14,
      fill: color,
      fontWeight: 'bold',
    });
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.renderAll();
  };

  // Clear all annotations
  const clearAnnotations = () => {
    if (!fabricCanvasRef.current) return;
    const objects = fabricCanvasRef.current.getObjects();
    // Keep only the background image
    objects.forEach((obj, idx) => {
      if (idx > 0) fabricCanvasRef.current.remove(obj);
    });
    fabricCanvasRef.current.renderAll();
  };

  // Delete selected object
  const deleteSelected = () => {
    if (!fabricCanvasRef.current) return;
    const active = fabricCanvasRef.current.getActiveObject();
    if (active) {
      fabricCanvasRef.current.remove(active);
      fabricCanvasRef.current.renderAll();
    }
  };

  // Save annotations
  const handleSave = () => {
    if (!fabricCanvasRef.current) return;
    setIsSaving(true);
    
    const objects = fabricCanvasRef.current.toJSON().objects.slice(1); // Exclude background image
    const annotationData = JSON.stringify(objects);
    
    onSave(annotationData);
    setIsSaving(false);
  };

  return (
    <div className="annotation-editor" style={{
      background: '#f9fafb',
      border: '2px solid #e5e7eb',
      borderRadius: 14,
      padding: 20,
      maxWidth: '100%',
    }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: '#111827', fontSize: 14, fontWeight: 900, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          🖍️ Mark Problem Areas on Image
        </p>
        <p style={{ color: '#6b7280', fontSize: 12, margin: '0 0 16px', fontWeight: 600 }}>
          Click tools below to add annotations. Drag to move, resize from corners. Press Delete to remove selected item.
        </p>
      </div>

      {/* Canvas */}
      <div style={{
        background: '#ffffff',
        border: '2px solid #d1d5db',
        borderRadius: 10,
        marginBottom: 16,
        overflow: 'auto',
        maxHeight: '520px',
      }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10,
        marginBottom: 16,
      }}>
        <button
          onClick={addCircle}
          className="annotation-tool-btn"
          style={{
            background: drawingMode === 'circle' ? '#dc2626' : '#f3f4f6',
            color: drawingMode === 'circle' ? '#fff' : '#111827',
            border: 'none',
            borderRadius: 8,
            padding: '10px 14px',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          ⭕ Add Circle
        </button>

        <button
          onClick={addRectangle}
          className="annotation-tool-btn"
          style={{
            background: drawingMode === 'rectangle' ? '#f59e0b' : '#f3f4f6',
            color: drawingMode === 'rectangle' ? '#fff' : '#111827',
            border: 'none',
            borderRadius: 8,
            padding: '10px 14px',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          ▪️ Add Rectangle
        </button>

        <button
          onClick={addText}
          className="annotation-tool-btn"
          style={{
            background: drawingMode === 'text' ? '#10b981' : '#f3f4f6',
            color: drawingMode === 'text' ? '#fff' : '#111827',
            border: 'none',
            borderRadius: 8,
            padding: '10px 14px',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          📝 Add Label
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>Color:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              if (fabricCanvasRef.current) {
                fabricCanvasRef.current.freeDrawingBrush.color = e.target.value;
              }
            }}
            style={{
              width: 40,
              height: 36,
              borderRadius: 6,
              border: '2px solid #d1d5db',
              cursor: 'pointer',
            }}
          />
        </div>

        <button
          onClick={deleteSelected}
          style={{
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 14px',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.opacity = '0.9'}
          onMouseLeave={(e) => e.target.style.opacity = '1'}
        >
          🗑️ Delete Selected
        </button>

        <button
          onClick={clearAnnotations}
          style={{
            background: '#6b7280',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 14px',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.opacity = '0.9'}
          onMouseLeave={(e) => e.target.style.opacity = '1'}
        >
          ↻ Clear All
        </button>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            flex: 2,
            background: isSaving ? '#cbd5e1' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 18px',
            fontWeight: 700,
            fontSize: 13,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => !isSaving && (e.target.style.background = '#1d4ed8')}
          onMouseLeave={(e) => !isSaving && (e.target.style.background = '#2563eb')}
        >
          {isSaving ? '💾 Saving...' : '💾 Save Annotations'}
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            background: '#e5e7eb',
            color: '#111827',
            border: 'none',
            borderRadius: 8,
            padding: '12px 18px',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
          onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default AnnotationEditor;
