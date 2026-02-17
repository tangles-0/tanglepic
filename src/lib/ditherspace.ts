export type DitherAlgorithm = "bayer" | "fs";
export type DitherColorMode = "bw" | "color";

export type DitherParams = {
  algorithm: DitherAlgorithm;
  colorMode: DitherColorMode;
  pixelSize: number;
  ditherAmount: number;
  bitDepth: number;
  contrast: number;
  scale: number;
  fgColor: string;
  bgColor: string;
};

type DitherCallbacks = {
  onResolutionChange?: (width: number, height: number) => void;
  onColorModeChange?: (colorMode: DitherColorMode) => void;
};

const DITHER_PREFERENCES_KEY = "ditherSpacePreferences";

export class ImageDitherer {
  private readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private fsCanvas: HTMLCanvasElement;
  private lastRenderedAlgo: DitherAlgorithm | null = null;
  private readonly callbacks: DitherCallbacks;

  originalWidth = 800;
  originalHeight = 600;
  aspectRatio = 1;
  imgElement: HTMLImageElement | null = null;
  params: DitherParams;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: DitherCallbacks = {},
    initialParams: Partial<DitherParams> = {},
  ) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.fsCanvas = document.createElement("canvas");
    this.params = { ...this.loadPreferences(), ...initialParams };
    this.initWebGL();
  }

  private defaultParams(): DitherParams {
    return {
      algorithm: "bayer",
      colorMode: "bw",
      pixelSize: 4,
      ditherAmount: 0.75,
      bitDepth: 2,
      contrast: 1,
      scale: 1,
      fgColor: "#000000",
      bgColor: "#ffffff",
    };
  }

  private loadPreferences(): DitherParams {
    const defaults = this.defaultParams();
    if (typeof window === "undefined") {
      return defaults;
    }
    const saved = window.localStorage.getItem(DITHER_PREFERENCES_KEY);
    if (!saved) {
      return defaults;
    }
    try {
      return { ...defaults, ...(JSON.parse(saved) as Partial<DitherParams>) };
    } catch {
      return defaults;
    }
  }

  private savePreferences(): void {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(DITHER_PREFERENCES_KEY, JSON.stringify(this.params));
    } catch {
      // Ignore storage errors.
    }
  }

  private initWebGL(): void {
    this.gl = this.canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!this.gl) {
      return;
    }

    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform float u_pixelSize;
      uniform float u_ditherAmount;
      uniform float u_bitDepth;
      uniform float u_contrast;
      uniform vec3 u_fgColor;
      uniform vec3 u_bgColor;
      uniform int u_mode;
      uniform int u_colorMode;
      varying vec2 v_texCoord;

      float bayer8x8(vec2 pos) {
        int x = int(mod(pos.x, 8.0));
        int y = int(mod(pos.y, 8.0));
        int idx = y * 8 + x;
        if (idx == 0) return 0.0 / 64.0;
        else if (idx == 1) return 32.0 / 64.0;
        else if (idx == 2) return 8.0 / 64.0;
        else if (idx == 3) return 40.0 / 64.0;
        else if (idx == 4) return 2.0 / 64.0;
        else if (idx == 5) return 34.0 / 64.0;
        else if (idx == 6) return 10.0 / 64.0;
        else if (idx == 7) return 42.0 / 64.0;
        else if (idx == 8) return 48.0 / 64.0;
        else if (idx == 9) return 16.0 / 64.0;
        else if (idx == 10) return 56.0 / 64.0;
        else if (idx == 11) return 24.0 / 64.0;
        else if (idx == 12) return 50.0 / 64.0;
        else if (idx == 13) return 18.0 / 64.0;
        else if (idx == 14) return 58.0 / 64.0;
        else if (idx == 15) return 26.0 / 64.0;
        else if (idx == 16) return 12.0 / 64.0;
        else if (idx == 17) return 44.0 / 64.0;
        else if (idx == 18) return 4.0 / 64.0;
        else if (idx == 19) return 36.0 / 64.0;
        else if (idx == 20) return 14.0 / 64.0;
        else if (idx == 21) return 46.0 / 64.0;
        else if (idx == 22) return 6.0 / 64.0;
        else if (idx == 23) return 38.0 / 64.0;
        else if (idx == 24) return 60.0 / 64.0;
        else if (idx == 25) return 28.0 / 64.0;
        else if (idx == 26) return 52.0 / 64.0;
        else if (idx == 27) return 20.0 / 64.0;
        else if (idx == 28) return 62.0 / 64.0;
        else if (idx == 29) return 30.0 / 64.0;
        else if (idx == 30) return 54.0 / 64.0;
        else if (idx == 31) return 22.0 / 64.0;
        else if (idx == 32) return 3.0 / 64.0;
        else if (idx == 33) return 35.0 / 64.0;
        else if (idx == 34) return 11.0 / 64.0;
        else if (idx == 35) return 43.0 / 64.0;
        else if (idx == 36) return 1.0 / 64.0;
        else if (idx == 37) return 33.0 / 64.0;
        else if (idx == 38) return 9.0 / 64.0;
        else if (idx == 39) return 41.0 / 64.0;
        else if (idx == 40) return 51.0 / 64.0;
        else if (idx == 41) return 19.0 / 64.0;
        else if (idx == 42) return 59.0 / 64.0;
        else if (idx == 43) return 27.0 / 64.0;
        else if (idx == 44) return 49.0 / 64.0;
        else if (idx == 45) return 17.0 / 64.0;
        else if (idx == 46) return 57.0 / 64.0;
        else if (idx == 47) return 25.0 / 64.0;
        else if (idx == 48) return 15.0 / 64.0;
        else if (idx == 49) return 47.0 / 64.0;
        else if (idx == 50) return 7.0 / 64.0;
        else if (idx == 51) return 39.0 / 64.0;
        else if (idx == 52) return 13.0 / 64.0;
        else if (idx == 53) return 45.0 / 64.0;
        else if (idx == 54) return 5.0 / 64.0;
        else if (idx == 55) return 37.0 / 64.0;
        else if (idx == 56) return 63.0 / 64.0;
        else if (idx == 57) return 31.0 / 64.0;
        else if (idx == 58) return 55.0 / 64.0;
        else if (idx == 59) return 23.0 / 64.0;
        else if (idx == 60) return 61.0 / 64.0;
        else if (idx == 61) return 29.0 / 64.0;
        else if (idx == 62) return 53.0 / 64.0;
        else return 21.0 / 64.0;
      }

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      void main() {
        if (u_mode == 1) {
          vec4 color = texture2D(u_image, v_texCoord);
          if (u_colorMode == 0) {
            float gray = color.r;
            vec3 finalColor = mix(u_bgColor, u_fgColor, gray);
            gl_FragColor = vec4(finalColor, 1.0);
          } else {
            gl_FragColor = color;
          }
        } else {
          vec2 uv = v_texCoord;
          vec2 pixelatedUV = floor(uv * u_resolution / u_pixelSize) * u_pixelSize / u_resolution;
          vec4 color = texture2D(u_image, pixelatedUV);

          if (u_colorMode == 0) {
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            gray = (gray - 0.5) * u_contrast + 0.5;
            gray = clamp(gray, 0.0, 1.0);

            vec2 pixelPos = floor(gl_FragCoord.xy);
            float bayerValue = bayer8x8(pixelPos);
            float noise = random(pixelPos * 0.01) * 0.1;
            bayerValue = mix(bayerValue, noise, 0.3);

            float threshold = mix(0.5, bayerValue, u_ditherAmount);
            float dithered = step(threshold, gray);

            float levels = pow(2.0, u_bitDepth);
            float quantized = floor(gray * levels) / levels;
            float final = mix(quantized, dithered, u_ditherAmount);

            vec3 finalColor = mix(u_bgColor, u_fgColor, final);
            gl_FragColor = vec4(finalColor, 1.0);
          } else {
            vec3 rgb = color.rgb;
            rgb = (rgb - 0.5) * u_contrast + 0.5;
            rgb = clamp(rgb, 0.0, 1.0);

            vec2 pixelPos = floor(gl_FragCoord.xy);
            float bayerValue = bayer8x8(pixelPos);
            float noise = random(pixelPos * 0.01) * 0.1;
            bayerValue = mix(bayerValue, noise, 0.3);
            float threshold = mix(0.5, bayerValue, u_ditherAmount);

            vec3 dithered = step(vec3(threshold), rgb);
            float levels = pow(2.0, u_bitDepth);
            vec3 quantized = floor(rgb * levels) / levels;
            vec3 final = mix(quantized, dithered, u_ditherAmount);
            gl_FragColor = vec4(final, 1.0);
          }
        }
      }
    `;

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) {
      return;
    }

    this.program = this.createProgram(vertexShader, fragmentShader);
    if (!this.program) {
      return;
    }

    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      this.gl.STATIC_DRAW,
    );

    this.texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
      this.gl.STATIC_DRAW,
    );

    this.texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
  }

  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) {
      return null;
    }
    const shader = this.gl.createShader(type);
    if (!shader) {
      return null;
    }
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    if (!this.gl) {
      return null;
    }
    const program = this.gl.createProgram();
    if (!program) {
      return null;
    }
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      this.gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  async loadImage(src: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        this.imgElement = img;
        this.originalWidth = img.width;
        this.originalHeight = img.height;
        this.aspectRatio = img.width / img.height;
        this.updateCanvasSize();
        this.lastRenderedAlgo = null;
        this.render();
        resolve();
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  private notifyResolutionChange(): void {
    this.callbacks.onResolutionChange?.(this.canvas.width, this.canvas.height);
  }

  updateCanvasSize(): void {
    if (!this.gl) {
      return;
    }
    this.canvas.width = Math.max(1, Math.floor(this.originalWidth * this.params.scale));
    this.canvas.height = Math.max(1, Math.floor(this.originalHeight * this.params.scale));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.notifyResolutionChange();
  }

  setCustomResolution(targetWidth: number, targetHeight: number): void {
    if (!this.gl) {
      return;
    }
    const width = Math.max(1, Math.floor(targetWidth));
    const height = Math.max(1, Math.floor(targetHeight));
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    const scaleX = width / this.originalWidth;
    const scaleY = height / this.originalHeight;
    this.params.scale = Math.min(scaleX, scaleY);
    this.savePreferences();
    this.notifyResolutionChange();
    this.render();
  }

  resetResolution(): void {
    this.params.scale = 1;
    this.updateCanvasSize();
    this.savePreferences();
    this.render();
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return [0, 0, 0];
    }
    return [
      Number.parseInt(result[1], 16) / 255,
      Number.parseInt(result[2], 16) / 255,
      Number.parseInt(result[3], 16) / 255,
    ];
  }

  private computeFloydSteinberg(): ImageData | null {
    if (!this.imgElement) {
      return null;
    }

    const pSize = Math.max(1, this.params.pixelSize);
    const procW = Math.max(1, Math.floor(this.canvas.width / pSize));
    const procH = Math.max(1, Math.floor(this.canvas.height / pSize));
    this.fsCanvas.width = procW;
    this.fsCanvas.height = procH;
    const ctx = this.fsCanvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    ctx.drawImage(this.imgElement, 0, 0, procW, procH);
    const imageData = ctx.getImageData(0, 0, procW, procH);
    const data = imageData.data;
    const width = procW;
    const height = procH;
    const contrast = this.params.contrast;
    const levels = Math.max(1, Math.pow(2, this.params.bitDepth) - 1);
    const ditherAmt = this.params.ditherAmount;

    if (this.params.colorMode === "bw") {
      const grayData = new Float32Array(width * height);
      for (let i = 0; i < data.length; i += 4) {
        let gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        gray /= 255;
        gray = (gray - 0.5) * contrast + 0.5;
        grayData[i / 4] = Math.max(0, Math.min(1, gray));
      }

      const blurredGray = new Float32Array(width * height);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const idx = y * width + x;
          let sum = grayData[idx] * 4;
          let count = 4;
          if (x > 0) {
            sum += grayData[idx - 1];
            count += 1;
          }
          if (x < width - 1) {
            sum += grayData[idx + 1];
            count += 1;
          }
          if (y > 0) {
            sum += grayData[idx - width];
            count += 1;
          }
          if (y < height - 1) {
            sum += grayData[idx + width];
            count += 1;
          }
          blurredGray[idx] = sum / count;
        }
      }

      for (let i = 0; i < grayData.length; i += 1) {
        grayData[i] = grayData[i] * 0.8 + blurredGray[i] * 0.2;
      }

      for (let y = 0; y < height; y += 1) {
        const direction = y % 2 === 0 ? 1 : -1;
        const xStart = y % 2 === 0 ? 0 : width - 1;
        const xEnd = y % 2 === 0 ? width : -1;
        for (let x = xStart; x !== xEnd; x += direction) {
          const idx = y * width + x;
          const oldVal = grayData[idx];
          const newVal = Math.round(oldVal * levels) / levels;
          grayData[idx] = newVal;
          const error = (oldVal - newVal) * ditherAmt;

          if (x + direction >= 0 && x + direction < width) {
            grayData[idx + direction] += error * (7 / 16);
          }
          if (y + 1 < height) {
            if (x - direction >= 0 && x - direction < width) {
              grayData[idx + width - direction] += error * (3 / 16);
            }
            grayData[idx + width] += error * (5 / 16);
            if (x + direction >= 0 && x + direction < width) {
              grayData[idx + width + direction] += error * (1 / 16);
            }
          }
        }
      }

      for (let i = 0; i < grayData.length; i += 1) {
        const px = Math.floor(Math.max(0, Math.min(1, grayData[i])) * 255);
        data[i * 4] = px;
        data[i * 4 + 1] = px;
        data[i * 4 + 2] = px;
        data[i * 4 + 3] = 255;
      }
      return imageData;
    }

    const rData = new Float32Array(width * height);
    const gData = new Float32Array(width * height);
    const bData = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;
      r = Math.max(0, Math.min(1, (r - 0.5) * contrast + 0.5));
      g = Math.max(0, Math.min(1, (g - 0.5) * contrast + 0.5));
      b = Math.max(0, Math.min(1, (b - 0.5) * contrast + 0.5));
      const idx = i / 4;
      rData[idx] = r;
      gData[idx] = g;
      bData[idx] = b;
    }

    const blurR = new Float32Array(width * height);
    const blurG = new Float32Array(width * height);
    const blurB = new Float32Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        let sumR = rData[idx] * 4;
        let sumG = gData[idx] * 4;
        let sumB = bData[idx] * 4;
        let count = 4;
        if (x > 0) {
          sumR += rData[idx - 1];
          sumG += gData[idx - 1];
          sumB += bData[idx - 1];
          count += 1;
        }
        if (x < width - 1) {
          sumR += rData[idx + 1];
          sumG += gData[idx + 1];
          sumB += bData[idx + 1];
          count += 1;
        }
        if (y > 0) {
          sumR += rData[idx - width];
          sumG += gData[idx - width];
          sumB += bData[idx - width];
          count += 1;
        }
        if (y < height - 1) {
          sumR += rData[idx + width];
          sumG += gData[idx + width];
          sumB += bData[idx + width];
          count += 1;
        }
        blurR[idx] = sumR / count;
        blurG[idx] = sumG / count;
        blurB[idx] = sumB / count;
      }
    }

    for (let i = 0; i < rData.length; i += 1) {
      rData[i] = rData[i] * 0.8 + blurR[i] * 0.2;
      gData[i] = gData[i] * 0.8 + blurG[i] * 0.2;
      bData[i] = bData[i] * 0.8 + blurB[i] * 0.2;
    }

    const diffuse = (channel: Float32Array): void => {
      for (let y = 0; y < height; y += 1) {
        const direction = y % 2 === 0 ? 1 : -1;
        const xStart = y % 2 === 0 ? 0 : width - 1;
        const xEnd = y % 2 === 0 ? width : -1;
        for (let x = xStart; x !== xEnd; x += direction) {
          const idx = y * width + x;
          const oldVal = channel[idx];
          const newVal = Math.round(oldVal * levels) / levels;
          channel[idx] = newVal;
          const error = (oldVal - newVal) * ditherAmt;
          if (x + direction >= 0 && x + direction < width) {
            channel[idx + direction] += error * (7 / 16);
          }
          if (y + 1 < height) {
            if (x - direction >= 0 && x - direction < width) {
              channel[idx + width - direction] += error * (3 / 16);
            }
            channel[idx + width] += error * (5 / 16);
            if (x + direction >= 0 && x + direction < width) {
              channel[idx + width + direction] += error * (1 / 16);
            }
          }
        }
      }
    };

    diffuse(rData);
    diffuse(gData);
    diffuse(bData);

    for (let i = 0; i < rData.length; i += 1) {
      data[i * 4] = Math.floor(Math.max(0, Math.min(1, rData[i])) * 255);
      data[i * 4 + 1] = Math.floor(Math.max(0, Math.min(1, gData[i])) * 255);
      data[i * 4 + 2] = Math.floor(Math.max(0, Math.min(1, bData[i])) * 255);
      data[i * 4 + 3] = 255;
    }
    return imageData;
  }

  render(): void {
    if (!this.gl || !this.program || !this.imgElement || !this.texture) {
      return;
    }
    this.gl.useProgram(this.program);

    const positionLocation = this.gl.getAttribLocation(this.program, "a_position");
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    const texCoordLocation = this.gl.getAttribLocation(this.program, "a_texCoord");
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    if (this.params.algorithm === "fs") {
      const fsData = this.computeFloydSteinberg();
      if (fsData) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, fsData);
        this.lastRenderedAlgo = "fs";
      }
      this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_mode"), 1);
    } else {
      if (this.lastRenderedAlgo !== "bayer") {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texImage2D(
          this.gl.TEXTURE_2D,
          0,
          this.gl.RGBA,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          this.imgElement,
        );
        this.lastRenderedAlgo = "bayer";
      }
      this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_mode"), 0);
    }

    this.gl.uniform2f(this.gl.getUniformLocation(this.program, "u_resolution"), this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_pixelSize"), this.params.pixelSize);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_ditherAmount"), this.params.ditherAmount);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_bitDepth"), this.params.bitDepth);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_contrast"), this.params.contrast);

    const fgColor = this.hexToRgb(this.params.fgColor);
    const bgColor = this.hexToRgb(this.params.bgColor);
    this.gl.uniform3f(this.gl.getUniformLocation(this.program, "u_fgColor"), fgColor[0], fgColor[1], fgColor[2]);
    this.gl.uniform3f(this.gl.getUniformLocation(this.program, "u_bgColor"), bgColor[0], bgColor[1], bgColor[2]);
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_colorMode"), this.params.colorMode === "color" ? 1 : 0);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  updateParams(newParams: Partial<DitherParams>): void {
    const needsResize = newParams.scale !== undefined && newParams.scale !== this.params.scale;
    const colorModeChanged =
      newParams.colorMode !== undefined && newParams.colorMode !== this.params.colorMode;
    this.params = { ...this.params, ...newParams };
    this.savePreferences();
    if (colorModeChanged) {
      this.callbacks.onColorModeChange?.(this.params.colorMode);
    }
    if (needsResize) {
      this.updateCanvasSize();
    }
    this.render();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  toBlob(type: string, quality?: number): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Unable to export image."));
            return;
          }
          resolve(blob);
        },
        type,
        quality,
      );
    });
  }
}