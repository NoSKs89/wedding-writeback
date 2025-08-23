export function createDiscoShader(canvas) {
  const gl = canvas.getContext("webgl");
  if (!gl) {
    console.error("WebGL not supported");
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  const vertexShaderSource = `
    attribute vec4 position;
    void main() {
        gl_Position = position;
    }
  `;

  const fragmentShaderSource = `
    precision highp float;
    uniform float time;
    uniform vec2 resolution;

    // Random function
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    // Star function
    float star(vec2 uv, float size, float brightness) {
        float d = length(uv);
        return smoothstep(size, size * 0.8, d) * brightness;
    }

    // Disco ball function
    vec3 discoBall(vec2 uv, float time) {
        // CUSTOMIZE: Adjust disco ball size (0.3 = 30% of screen height)
        float dist = length(uv);
        float ballMask = smoothstep(0.3, 0.29, dist);
        
        // CUSTOMIZE: Adjust rotation speed and pattern density
        float angle = atan(uv.y, uv.x);
        float radius = dist * 10.0;
        
        // CUSTOMIZE: Adjust pattern complexity (6.0 = hexagonal)
        float hex = sin(angle * 6.0 + time) * 0.5 + 0.5;
        float hex2 = sin(radius * 2.0 + time * 0.5) * 0.5 + 0.5;
        
        // CUSTOMIZE: Change disco ball colors
        vec3 color1 = vec3(1.0, 0.2, 0.2); // Red
        vec3 color2 = vec3(0.2, 1.0, 0.2); // Green
        vec3 color3 = vec3(0.2, 0.2, 1.0); // Blue
        
        vec3 discoColor = mix(
            mix(color1, color2, hex),
            color3,
            hex2
        );
        
        // CUSTOMIZE: Adjust sparkle intensity (8.0 = power, 0.5 = brightness)
        float sparkle = random(uv + time) * 0.5 + 0.5;
        sparkle = pow(sparkle, 8.0) * 0.5;
        
        return discoColor * ballMask + vec3(sparkle) * ballMask;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
        
        // CUSTOMIZE: Change background color
        vec3 backgroundColor = vec3(0.02, 0.05, 0.1);
        vec3 finalColor = backgroundColor;
        
        // CUSTOMIZE: Adjust number of stars (100 = star count)
        for(int i = 0; i < 100; i++) {
            float x = random(vec2(float(i), 1.0)) * 2.0 - 1.0;
            float y = random(vec2(float(i), 2.0)) * 2.0 - 1.0;
            vec2 starPos = vec2(x, y);
            
            // CUSTOMIZE: Adjust twinkle speed (0.5 = base speed)
            float twinkle = sin(time * (0.5 + random(vec2(float(i), 3.0)))) * 0.5 + 0.5;
            float starBrightness = random(vec2(float(i), 4.0)) * 0.5 + 0.5;
            starBrightness *= twinkle;
            
            // CUSTOMIZE: Adjust star size (0.01 = max size, 0.005 = min size)
            float starSize = random(vec2(float(i), 5.0)) * 0.01 + 0.005;
            float starValue = star(uv - starPos, starSize, starBrightness);
            
            finalColor += vec3(starValue);
        }
        
        vec3 discoColor = discoBall(uv, time);
        finalColor = mix(finalColor, discoColor, discoColor.r + discoColor.g + discoColor.b);
        
        // CUSTOMIZE: Adjust vignette strength (0.5 = inner radius, 1.5 = outer radius)
        float vignette = 1.0 - smoothstep(0.5, 1.5, length(uv));
        finalColor *= vignette;
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program linking error:", gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);

  const positionAttribute = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(positionAttribute);
  gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

  const resolutionUniform = gl.getUniformLocation(program, "resolution");
  const timeUniform = gl.getUniformLocation(program, "time");

  function render(time) {
    gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
    gl.uniform1f(timeUniform, time * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
} 