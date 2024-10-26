let elements = [];
let movements = [];
let animationId;
let startTime;
const animationDuration = 10000; // Adjust as needed for longer/shorter animations
const frames = [];
const canvas = document.getElementById('diagramCanvas');
const ctx = canvas.getContext('2d');

// Load YAML button
document.getElementById("loadYAMLButton").addEventListener("click", function () {
    const yamlText = document.getElementById("yamlInput").value;
    parseYAML(yamlText);
});

// Animate button
document.getElementById("animateButton").addEventListener("click", function () {
    animateDiagram();
});

// Generate GIF button
document.getElementById("generateGIFButton").addEventListener("click", function () {
    createGIF(frames);
});


// Allowed properties for each premade shape type
const allowedShapeProperties = {
    rectangle: ["width", "height"],
    star: ["size"],
    cloud: ["width", "height"],
    database: ["width", "height"],
    line: ["length", "rotation", "width"],
    "line-arrow": ["length", "rotation", "width"],
    arrow: ["length", "rotation", "width"],
    cat: ["size"],
    dog: ["size"]
};

// Function to parse YAML input and apply default properties
function parseYAML(yamlText) {
    try {
        const doc = jsyaml.load(yamlText);
        elements = doc.objects || [];
        movements = doc.movements || [];

        elements.forEach(el => {
            el.x = el.startX;
            el.y = el.startY;

            // Set shape defaults
            if (el.shape) {
                const { premade, custom } = el.shape;
                if (premade && custom) {
                    throw new Error("Shape cannot have both 'premade' and 'custom' values");
                }
                if (!premade && !custom) {
                    throw new Error("Shape must specify either 'premade' or 'custom'");
                }

                if (premade) {
                    const allowedProperties = allowedShapeProperties[premade];
                    el.shape = setShapeDefaults(el.shape, premade);
                    el.shape = filterProperties(el.shape, allowedProperties);
                }

                // Set default outline properties
                el.shape.outline = {
                    thickness: el.shape.outline?.thickness || 1,
                    color: el.shape.outline?.color || "black"
                };
            } else {
                throw new Error("Each object must have a 'shape' property.");
            }

            // Default label properties
            el.label = el.label || {};
            el.label.offsetX = el.label.offsetX || 10;
            el.label.offsetY = el.label.offsetY || 10;
            el.label.font = el.label.font || '14px Arial';
            el.label.style = el.label.style || 'normal';
            el.label.color = el.label.color || 'black';
            el.label.value = el.label.value || '';
        });

        drawDiagram();
    } catch (error) {
        alert('Error parsing YAML: ' + error.message);
    }
}

// Filter properties to remove extraneous fields based on allowed properties
function filterProperties(shape, allowedProperties) {
    return Object.keys(shape).reduce((filtered, key) => {
        if (allowedProperties.includes(key) || key === "premade" || key === "custom" || key === "outline") {
            filtered[key] = shape[key];
        }
        return filtered;
    }, {});
}


// Drawing Functions
function drawDiagram() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach(element => {
        const { outline } = element.shape || {};
        const outlineThickness = outline?.thickness || 1;
        const outlineColor = outline?.color || "black";

        ctx.beginPath();
        ctx.fillStyle = element.color;
        ctx.lineWidth = outlineThickness;
        ctx.strokeStyle = outlineColor;

        const shape = element.shape;
        const { premade } = shape;
        switch (premade) {
            case "rectangle":
                ctx.rect(element.x, element.y, shape.width, shape.height);
                break;
            case "star":
                drawStar(ctx, element.x, element.y, shape.size);
                break;
            case "cloud":
                drawCloud(ctx, element.x, element.y, shape.width, shape.height);
                break;
            case "database":
                drawDatabase(ctx, element.x, element.y, shape.width, shape.height);
                break;
            case "line":
            case "line-arrow":
            case "arrow":
                drawLineOrArrow(ctx, element.x, element.y, shape.length, shape.rotation, premade);
                break;
            case "cat":
                drawCat(ctx, element.x, element.y, shape.size);
                break;
            case "dog":
                drawDog(ctx, element.x, element.y, shape.size);
                break;
        }

        // Fill and outline shape
        ctx.fill();
        if (outline) ctx.stroke();
        ctx.closePath();

        // Draw label
        if (element.label && element.label.value) {
            ctx.fillStyle = element.label.color;
            ctx.font = element.label.font;
            ctx.fillText(
                element.label.value,
                element.x + element.label.offsetX,
                element.y + element.label.offsetY
            );
        }
    });
}


// Function to animate the diagram based on movements
function animateDiagram() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    startTime = Date.now();
    frames.length = 0; // Clear previous frames
    let lastFrameTime = 0;

    function animate() {
        while (Date.now() - lastFrameTime < 20) {
            // do nothing
        }
        const elapsedTime = Date.now() - startTime;
        lastFrameTime = Date.now()

        elements.forEach(element => {
            let currentX = element.x;
            let currentY = element.y;

            let xMovement = { start: currentX, end: currentX };
            let yMovement = { start: currentY, end: currentY };

            movements.forEach(movement => {
                if (movement.name === element.name && elapsedTime >= movement.timeStart) {
                    if (typeof movement.actualStartX === 'undefined') {
                        movement.actualStartX = movement.startX ?? currentX
                        movement.actualStartY = movement.startY ?? currentY
                    }
                    const movementDuration = movement.timeEnd - movement.timeStart
                    const progress = Math.min(1, (elapsedTime - movement.timeStart) / movementDuration);
                    const strategy = movement.strategy
                    
                    // Handle X axis movement
                    if (typeof movement.endX !== 'undefined') {
                        const startX = movement.actualStartX
                        if (strategy === "linear") {
                            xMovement.end = interpolateLinear(startX, movement.endX, progress)
                        } else if (strategy === "cosine") {
                            xMovement.end = interpolateCosine(startX, movement.endX, progress)
                        } else {
                            console.error("Movement has invalid properties", movement)
                            throw new Error("Unsupported movement strategy " + strategy);
                        }
                    }

                    // Handle Y axis movement
                    if (typeof movement.endY !== 'undefined') {
                        const startY = movement.actualStartY
                        if (strategy === "linear") {
                            yMovement.end = interpolateLinear(startY, movement.endY, progress)
                        } else if (strategy === "cosine") {
                            yMovement.end = interpolateCosine(startY, movement.endY, progress)
                        } else {
                            console.error("Movement has invalid properties", movement)
                            throw new Error("Unsupported movement strategy " + strategy);
                        }
                    }
                }
            });

            element.x = xMovement.end;
            element.y = yMovement.end;
        });

        drawDiagram();
        frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); // Capture the frame

        if (elapsedTime < animationDuration) {
            animationId = requestAnimationFrame(animate);
        } else {
            // End of animation, finalize frames
            // createGIF(frames);
        }
    }

    animate();
}

function interpolateLinear(startPos, endPos, progress) {
    console.log("startPos", startPos, "endPos", endPos, "progress", progress)
    return startPos + (endPos - startPos) * progress;
}

function interpolateCosine(startPos, endPos, progress) {
    let cosProgress = (1 - Math.cos(progress * Math.PI)) / 2
    return startPos * (1 - cosProgress) + endPos * cosProgress
}

// Calculate the velocity based on a parabolic curve
function calculateVelocity(startY, endY, duration, t) {
    const midPointTime = duration / 2; // Midpoint in time
    const a = (endY - startY) / Math.pow(midPointTime, 2); // Coefficient for parabolic velocity

    return a * Math.pow(t - midPointTime, 2) + startY; // Parabolic velocity equation
}

// Function to generate GIF from captured frames
function createGIF(frames) {
    const gif = new GIF({
        workers: 2,
        quality: 10,
        width: canvas.width,
        height: canvas.height,
        delay: 20, // Delay between frames in ms
        workerScript: 'gif.worker.js'
    });

    console.log("Frames", frames)
    frames.forEach(frame => {
        console.log("Adding frame")
        gif.addFrame(frame, { delay: 20 }); // Add each frame to the GIF
    });

    // Finalize the GIF and trigger the finished event
    gif.on('finished', function(blob) {
        console.log("Finished gif")
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'animation.gif';
        link.click();
    });

    // Render the GIF
    gif.render();
}

function drawCat(ctx, x, y, size) {
    // Draw head
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2); // Head
    ctx.fill();

    // Draw ears
    ctx.beginPath();
    ctx.moveTo(x - size * 0.2, y - size * 0.4); // Left ear
    ctx.lineTo(x - size * 0.4, y - size * 0.6);
    ctx.lineTo(x - size * 0.1, y - size * 0.5);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + size * 0.2, y - size * 0.4); // Right ear
    ctx.lineTo(x + size * 0.4, y - size * 0.6);
    ctx.lineTo(x + size * 0.1, y - size * 0.5);
    ctx.fill();

    // Draw eyes
    ctx.beginPath();
    ctx.arc(x - size * 0.1, y - size * 0.1, size * 0.05, 0, Math.PI * 2); // Left eye
    ctx.arc(x + size * 0.1, y - size * 0.1, size * 0.05, 0, Math.PI * 2); // Right eye
    ctx.fillStyle = "black";
    ctx.fill();

    // Draw nose
    ctx.beginPath();
    ctx.moveTo(x, y); // Nose
    ctx.lineTo(x - size * 0.05, y + size * 0.05);
    ctx.lineTo(x + size * 0.05, y + size * 0.05);
    ctx.closePath();
    ctx.fillStyle = "black";
    ctx.fill();

    // Draw whiskers
    ctx.beginPath();
    ctx.moveTo(x - size * 0.15, y + size * 0.05); // Left whiskers
    ctx.lineTo(x - size * 0.3, y + size * 0.1);
    ctx.moveTo(x - size * 0.15, y + size * 0.1);
    ctx.lineTo(x - size * 0.3, y + size * 0.15);

    ctx.moveTo(x + size * 0.15, y + size * 0.05); // Right whiskers
    ctx.lineTo(x + size * 0.3, y + size * 0.1);
    ctx.moveTo(x + size * 0.15, y + size * 0.1);
    ctx.lineTo(x + size * 0.3, y + size * 0.15);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawDog(ctx, x, y, size) {
    // Draw head
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2); // Head
    ctx.fill();

    // Draw ears
    ctx.beginPath();
    ctx.ellipse(x - size * 0.3, y - size * 0.2, size * 0.15, size * 0.25, Math.PI / 6, 0, Math.PI * 2); // Left ear
    ctx.ellipse(x + size * 0.3, y - size * 0.2, size * 0.15, size * 0.25, -Math.PI / 6, 0, Math.PI * 2); // Right ear
    ctx.fillStyle = "darkbrown";
    ctx.fill();

    // Draw eyes
    ctx.beginPath();
    ctx.arc(x - size * 0.1, y - size * 0.1, size * 0.05, 0, Math.PI * 2); // Left eye
    ctx.arc(x + size * 0.1, y - size * 0.1, size * 0.05, 0, Math.PI * 2); // Right eye
    ctx.fillStyle = "black";
    ctx.fill();

    // Draw nose
    ctx.beginPath();
    ctx.arc(x, y + size * 0.1, size * 0.05, 0, Math.PI * 2); // Nose
    ctx.fillStyle = "black";
    ctx.fill();

    // Draw mouth
    ctx.beginPath();
    ctx.moveTo(x - size * 0.05, y + size * 0.15);
    ctx.lineTo(x, y + size * 0.2);
    ctx.lineTo(x + size * 0.05, y + size * 0.15);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.stroke();
}



function drawStar(ctx, x, y, size) {
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size / 2;
    let rotation = Math.PI / 2 * 3;
    let cx = x;
    let cy = y;
    let step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rotation) * outerRadius, cy + Math.sin(rotation) * outerRadius);
        rotation += step;

        ctx.lineTo(cx + Math.cos(rotation) * innerRadius, cy + Math.sin(rotation) * innerRadius);
        rotation += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
}

function drawCloud(ctx, x, y, width, height) {
    ctx.arc(x, y, width / 4, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(x + width / 4, y - height / 2, width / 4, Math.PI, 0);
    ctx.arc(x + width / 2, y - height / 2, width / 4, Math.PI, 0);
    ctx.arc(x + width, y, width / 4, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
}

function drawDatabase(ctx, x, y, width, height) {
    ctx.ellipse(x, y, width / 2, height / 4, 0, 0, Math.PI * 2);
    ctx.rect(x - width / 2, y - height / 2, width, height);
    ctx.moveTo(x - width / 2, y + height / 2);
    ctx.ellipse(x, y + height / 2, width / 2, height / 4, 0, 0, Math.PI);
}

function drawLineOrArrow(ctx, x, y, length, rotation, type) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((Math.PI / 180) * rotation);

    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);

    if (type === "line-arrow" || type === "arrow") {
        ctx.lineTo(length - 10, -5);
        ctx.moveTo(length, 0);
        ctx.lineTo(length - 10, 5);
    }

    ctx.restore();
}


// Elements for YAML input and defaults display
const yamlInput = document.getElementById("yamlInput");
const yamlDefaultsDisplay = document.getElementById("yamlDefaultsDisplay");

// Default values for different shapes
const shapeDefaults = {
    rectangle: { width: 100, height: 50 },
    star: { size: 50 },
    line: { length: 100, rotation: 0, width: 5 },
    "line-arrow": { length: 100, rotation: 0, width: 5 },
    arrow: { length: 100, rotation: 0, width: 5 },
    cloud: { width: 100, height: 50 },
    database: { width: 100, height: 50 }
};

// Function to set default values for shapes
function setShapeDefaults(shape, premade) {
    switch (premade) {
        case "rectangle":
            shape.width = shape.width || 100;
            shape.height = shape.height || 50;
            break;
        case "star":
            shape.size = shape.size || 50;
            break;
        case "line":
        case "line-arrow":
        case "arrow":
            shape.length = shape.length || 100;
            shape.rotation = shape.rotation || 0;
            shape.width = shape.width || 5;
            break;
        case "cloud":
        case "database":
            shape.width = shape.width || 100;
            shape.height = shape.height || 50;
            break;
        case "cat":
        case "dog":
            shape.size = shape.size || 50;
            break;
    }
    return shape;
}

// Function to update YAML Defaults Display based on cursor position
function updateYamlDefaultsDisplay() {
    try {
        const yamlText = yamlInput.value;
        const doc = jsyaml.load(yamlText);
        const cursorPosition = yamlInput.selectionStart;
        const objectUnderCursor = getObjectUnderCursor(doc, cursorPosition);

        if (objectUnderCursor) {
            if (objectUnderCursor.shape) {
                const { premade } = objectUnderCursor.shape;
                if (premade && allowedShapeProperties[premade]) {
                    objectUnderCursor.shape = setShapeDefaults(objectUnderCursor.shape, premade); // Apply shape defaults
                    objectUnderCursor.shape.outline = {
                        thickness: objectUnderCursor.shape.outline?.thickness || 1,
                        color: objectUnderCursor.shape.outline?.color || "black"
                    };
                    objectUnderCursor.shape = filterProperties(objectUnderCursor.shape, allowedShapeProperties[premade]);
                }
            }

            // Default label properties if not present
            objectUnderCursor.label = {
                offsetX: 10,
                offsetY: 10,
                font: '14px Arial',
                style: 'normal',
                color: 'black',
                value: '',
                ...objectUnderCursor.label
            };

            // Display the object with defaults in the read-only text area
            yamlDefaultsDisplay.value = jsyaml.dump(objectUnderCursor);
        } else {
            yamlDefaultsDisplay.value = "";
        }
    } catch (error) {
        console.error("Error parsing YAML:", error);
        yamlDefaultsDisplay.value = "";
    }
}


// Helper function to find the object under cursor in YAML input
function getObjectUnderCursor(doc, cursorPosition) {
    const yamlLines = yamlInput.value.substring(0, cursorPosition).split('\n');
    const objectName = findObjectName(yamlLines);

    // Return the found object with that name
    return doc.objects?.find(obj => obj.name === objectName) || null;
}

// Helper function to find object name from cursor position in YAML input
function findObjectName(lines) {
    for (let i = lines.length - 1; i >= 0; i--) {
        const match = lines[i].match(/^\s*-\s*name:\s*(\S+)/);
        if (match) return match[1];
    }
    return null;
}

// Event listeners for YAML input changes and cursor movements
yamlInput.addEventListener("input", updateYamlDefaultsDisplay);
yamlInput.addEventListener("click", updateYamlDefaultsDisplay);
yamlInput.addEventListener("keyup", updateYamlDefaultsDisplay);
