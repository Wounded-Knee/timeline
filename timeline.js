class Timeline {
    options = {
        line: {
            color: 'gray',
            position: 80,
        },
        timestamps: {
            color: 'black',
            position: 5,
            interval: 1000,
            font: '12px Courier New',
            align: 'left',
        },
        msPerPx: 0.05,
        interval: 25,
        onMouseUpdate: () => {},
    };
    mouse = {
        drag: undefined,
    };
    canvas = undefined;
    startTime = undefined;
    baseTime = undefined;
    displayTime = undefined;
    pxOffset = 0;
    resizeObserver = undefined;
    interval = undefined;

    constructor(options) {
        this.options = { ...this.options, ...options };
        const {
            options: {
                node,
            },
        } = this;

        this.startTime = this.baseTime = this.displayTime = new Date();

        // Create a canvas element
        const canvas = document.createElement('canvas');
        this.canvas = node.appendChild(canvas);

        window.addEventListener('resize', this.fitCanvas.bind(this));
        window.addEventListener('zoom', this.fitCanvas.bind(this));
        this.canvas.addEventListener("wheel", this.mouseWheel.bind(this), { passive: false });
        if (false) {
            this.resizeObserver = new ResizeObserver(this.fitCanvas.bind(this));
            this.resizeObserver.observe(
                this.canvas.parentNode,
            );
        }
        this.mouseHandlers();
        this.fitCanvas();

        this.proceed();
    }

    halt() {
        const {
            options: {
                interval,
            },
        } = this;
        clearInterval(this.interval);
    }

    proceed() {
        const {
            options: {
                interval,
            },
        } = this;
        this.interval = setInterval(this.tick.bind(this), interval);
    }

    // Handles mouse movement events. Destructures the xy coordinates of the mouse from the event object.
    mouseMove({ clientX: x, clientY: y }) {
        this.mouse.position = {
            ...this.mouse.position,
            x,
            y,
            date: this.pxToDate(y),
        };
        this.options.onMouseUpdate(this.mouse);
    }

    mouseWheel({ deltaY }) {
        this.pxOffset -= deltaY * 10;
    }

    mouseHandlers() {
        window.addEventListener('mousemove', this.mouseMove.bind(this));
        this.canvas.addEventListener('mousedown', ({ clientY }) => {
            this.mouse.drag = {
                ...this.mouse.drag,
                originalPxOffset: this.pxOffset,
                downPosition: clientY,
                currentPosition: clientY,
            };
        });
        this.canvas.addEventListener('mousemove', ({ clientY }) => {
            if (this.mouse.drag) {
                this.freeze = true;
                this.mouse.drag = {
                    ...this.mouse.drag,
                    currentPosition: clientY,
                };
                this.pxOffset = this.mouse.drag.originalPxOffset - (this.mouse.drag.downPosition - this.mouse.drag.currentPosition);
            }
        });
        window.addEventListener('mouseup', () => {
            this.mouse.drag = undefined;
        });
        this.canvas.addEventListener('dblclick', () => this.freeze = false);
    }

    tick() {
        if (!this.freeze) this.displayTime = new Date();
        this.paint();
    }

    resizeCanvas(width, height) {
        this.canvas.height = height;
        this.canvas.width = width;
    }

    fitCanvas() {
        this.resizeCanvas(
            this.canvas.parentElement.offsetWidth,
            this.canvas.parentElement.offsetHeight,
        );
        this.paint();
    }

    paint() {
        const ctx = this.canvas.getContext('2d');

        // Clear the canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.line();
        this.timestamps();
        this.nowLine();
        this.startLine();
    }

    line() {
        const {
            options: {
                line,
                timestamps,
            },
            canvas,
        } = this;
        const ctx = canvas.getContext('2d');

        // Set the line color
        ctx.strokeStyle = line.color;
        ctx.lineWidth = '4';

        // Draw the vertical line
        ctx.beginPath();
        ctx.moveTo(line.position, 0);          // Starting point (15px from the left edge)
        ctx.lineTo(line.position, this.canvas.height);  // Ending point (bottom of the canvas)
        ctx.stroke();
    }

    startLine() {
        const {
            options: {
                line,
            },
            canvas,
            baseTime,
        } = this;
        const ctx = canvas.getContext('2d');
        // Set the line color
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = '1';

        const px = this.dateToPx(baseTime);
        ctx.beginPath();
        ctx.moveTo(100, px);
        ctx.lineTo(this.canvas.width, px);
        ctx.stroke();
    }

    nowLine() {
        const {
            options: {
                line,
            },
            canvas,
        } = this;
        const ctx = canvas.getContext('2d');
        // Set the line color
        ctx.strokeStyle = 'black';
        ctx.lineWidth = '1';

        const px = this.dateToPx(new Date());
        ctx.beginPath();
        ctx.moveTo(100, px);
        ctx.lineTo(this.canvas.width, px);
        ctx.stroke();
    }

    timestamps() {
        const {
            options: {
                timestamps: {
                    interval,
                    position,
                    color,
                    font,
                    align,
                },
                msPerPx,
            },
            canvas,
            baseTime,
            displayTime,
            pxOffset,
        } = this;
        const ctx = canvas.getContext('2d');
        const overflowPx = 100;

        // Set text properties
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.textAlign = align;

        const time = {
            start: new Date(displayTime.getTime() - this.msOffset()),
            end: new Date(displayTime.getTime() - this.pxToMs(canvas.height) - this.msOffset()),
        };

        for (
            var date = new Date(time.start.getTime() + interval + this.msOffset());
            date.getTime() > time.end.getTime();
            date = new Date((Math.round(date.getTime() / interval) * interval) - interval - this.msOffset())
        ) {
            const px = this.dateToPx(date) - pxOffset;
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
            console.info(px, date.getTime(), time);
            ctx.fillText(
                `${minutes}:${seconds}:${milliseconds}`,
                position,
                px,
            );
        }
    }

    dateToPx(date, debug) {
        const {
            displayTime,
            pxOffset,
            options: {
                msPerPx
            }
        } = this;
        if (debug) {
            console.log(
                displayTime,
                date,
                this.msOffset(),
                msPerPx,
            );
        }
        return (displayTime.getTime() - date.getTime() - this.msOffset()) * msPerPx;
    }

    pxToDate(px) {
        const {
            displayTime,
            pxOffset,
            options: {
                msPerPx
            }
        } = this;

        return new Date(displayTime.getTime() - this.pxToMs(px) - this.msOffset() / msPerPx);
    }

    pxToMs(px) {
        const {
            options: {
                msPerPx,
            },
        } = this;
        return px / msPerPx;
    }

    msToPx(ms) {
        const {
            options: {
                msPerPx,
            },
        } = this;
        return px * msPerPx;
    }

    msOffset() {
        const {
            pxOffset,
            options: {
                msPerPx,
            },
        } = this;
        return -pxOffset * msPerPx;
    }
}
