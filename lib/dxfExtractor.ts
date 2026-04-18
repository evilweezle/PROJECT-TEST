import DxfParser from 'dxf-parser';

export interface DxfExtractedData {
    cutLength: number;
    area: number;
    weight: number;
    pierces: number;
    sharpCorners: number;
    blankX: number;
    blankY: number;
    realSurface: number;
    bends: number;
}

export function extractDataFromDxf(dxfContent: string, density: number = 0.284, thickness: number = 0.125): DxfExtractedData {
    const parser = new DxfParser();
    try {
        const dxf = parser.parseSync(dxfContent);
        if (!dxf) throw new Error("Failed to parse DXF");

        let totalLength = 0;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let pierces = 0;
        let sharpCorners = 0;
        let bends = 0;
        
        const loops: { vertices: {x: number, y: number}[], area: number, length: number }[] = [];

        function updateBounds(x: number, y: number) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        function calculatePolygonArea(vertices: {x: number, y: number}[]) {
            let area = 0;
            for (let i = 0; i < vertices.length; i++) {
                const j = (i + 1) % vertices.length;
                area += vertices[i].x * vertices[j].y;
                area -= vertices[j].x * vertices[i].y;
            }
            return Math.abs(area / 2);
        }

        function isSharpCorner(vPrev: {x: number, y: number}, vCurr: {x: number, y: number}, vNext: {x: number, y: number}) {
            const dx1 = vCurr.x - vPrev.x;
            const dy1 = vCurr.y - vPrev.y;
            const dx2 = vNext.x - vCurr.x;
            const dy2 = vNext.y - vCurr.y;
            
            const mag1 = Math.sqrt(dx1*dx1 + dy1*dy1);
            const mag2 = Math.sqrt(dx2*dx2 + dy2*dy2);
            
            if (mag1 < 0.001 || mag2 < 0.001) return false;
            
            // Dot product of normalized vectors
            const dot = (dx1*dx2 + dy1*dy2) / (mag1 * mag2);
            // If dot product is close to 1, it's a straight line. If < 0.99 (roughly < 8 degrees), it's a corner.
            return dot < 0.999;
        }

        dxf.entities.forEach((entity: { type: string }) => {
            if (entity.type === 'LINE') {
                const line = entity as { vertices: {x: number, y: number}[], lineTypeName?: string };
                const dist = Math.sqrt(Math.pow(line.vertices[1].x - line.vertices[0].x, 2) + Math.pow(line.vertices[1].y - line.vertices[0].y, 2));
                totalLength += dist;
                updateBounds(line.vertices[0].x, line.vertices[0].y);
                updateBounds(line.vertices[1].x, line.vertices[1].y);
                
                if (line.lineTypeName && (line.lineTypeName.toLowerCase().includes('dash') || line.lineTypeName.toLowerCase().includes('hid'))) {
                    bends++;
                }
            } else if (entity.type === 'CIRCLE') {
                const circle = entity as { radius: number, center: {x: number, y: number} };
                const circLength = 2 * Math.PI * circle.radius;
                totalLength += circLength;
                updateBounds(circle.center.x - circle.radius, circle.center.y - circle.radius);
                updateBounds(circle.center.x + circle.radius, circle.center.y + circle.radius);
                pierces++;
                
                loops.push({
                    vertices: [], // Doesn't need vertices for area calculation of circle
                    area: Math.PI * Math.pow(circle.radius, 2),
                    length: circLength
                });
            } else if (entity.type === 'ARC') {
                const arc = entity as { radius: number, startAngle: number, endAngle: number, center: {x: number, y: number} };
                const angle = (arc.endAngle < arc.startAngle) ? (2 * Math.PI - arc.startAngle + arc.endAngle) : (arc.endAngle - arc.startAngle);
                totalLength += arc.radius * angle;
                updateBounds(arc.center.x - arc.radius, arc.center.y - arc.radius);
                updateBounds(arc.center.x + arc.radius, arc.center.y + arc.radius);
            } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
                const poly = entity as { vertices: {x: number, y: number}[], shape?: boolean };
                const vertices = poly.vertices;
                if (vertices.length < 2) return;

                let polyLength = 0;
                for (let i = 0; i < vertices.length - 1; i++) {
                    const d = Math.sqrt(Math.pow(vertices[i+1].x - vertices[i].x, 2) + Math.pow(vertices[i+1].y - vertices[i].y, 2));
                    polyLength += d;
                    updateBounds(vertices[i].x, vertices[i].y);
                    
                    if (i > 0) {
                        if (isSharpCorner(vertices[i-1], vertices[i], vertices[i+1])) {
                            sharpCorners++;
                        }
                    }
                }
                updateBounds(vertices[vertices.length-1].x, vertices[vertices.length-1].y);

                if (poly.shape) { // Closed polyline
                    const lastD = Math.sqrt(Math.pow(vertices[0].x - vertices[vertices.length-1].x, 2) + Math.pow(vertices[0].y - vertices[vertices.length-1].y, 2));
                    polyLength += lastD;
                    totalLength += polyLength;

                    // Sharp corners for closed loop
                    if (isSharpCorner(vertices[vertices.length-2], vertices[vertices.length-1], vertices[0])) sharpCorners++;
                    if (isSharpCorner(vertices[vertices.length-1], vertices[0], vertices[1])) sharpCorners++;

                    loops.push({
                        vertices: vertices,
                        area: calculatePolygonArea(vertices),
                        length: polyLength
                    });
                } else {
                    totalLength += polyLength;
                }
            }
        });

        const blankX = (maxX === -Infinity) ? 0 : maxX - minX;
        const blankY = (maxY === -Infinity) ? 0 : maxY - minY;
        
        // Accurate area calculation
        // Let's assume the loop with the largest area is the boundary
        let maxArea = 0;
        let totalHolesArea = 0;
        
        if (loops.length > 0) {
            loops.sort((a, b) => b.area - a.area);
            maxArea = loops[0].area;
            for (let i = 1; i < loops.length; i++) {
                totalHolesArea += loops[i].area;
            }
        }

        const realSurface = maxArea - totalHolesArea;
        const finalArea = realSurface > 0 ? realSurface : (blankX * blankY * 0.9); // Fallback to heuristic if loop detection failed
        const weight = finalArea * density * thickness;

        return {
            cutLength: totalLength,
            area: finalArea,
            weight: weight,
            pierces: pierces,
            sharpCorners: sharpCorners,
            blankX: blankX,
            blankY: blankY,
            realSurface: finalArea,
            bends: bends
        };

    } catch (err) {
        console.error("DXF Extraction Error:", err);
        throw err;
    }
}
