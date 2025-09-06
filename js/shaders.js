const basic = {
  vs: `#version 300 es
    in vec3 a_position;
    in vec3 a_color;
    uniform mat4 u_matrix;
    out vec4 v_color;
    
    void main() {
      gl_Position = u_matrix * vec4(a_position/60.0, 1.0);
      v_color = vec4(a_color, 1.0);
    }`,
  fs: `#version 300 es
    precision highp float;
    
    in vec4 v_color;
    out vec4 outColor;
    
    void main() {
      outColor = v_color;
    }
  `,
  attribs: {
    a_position: {
      type: "FLOAT",
      size: 3,
      normalize: false
    },
    a_color: {
      type: "UNSIGNED_BYTE",
      size: 3,
      normalize: true
    }
  },
  uniforms: {
    u_matrix: {
      method: "uniformMatrix4fv",
      args: [false]
    }
  }
}

const tex = {
  vs: `#version 300 es
    in vec3 a_position;
    in vec2 a_texcoord;

    uniform mat4 u_matrix;
    uniform float u_pointSize;
    uniform vec2 u_resolution;

    out vec2 v_texcoord;

    void main() {
      gl_Position = u_matrix * vec4(a_position / 60.0, 1.0);
      gl_PointSize = u_pointSize;
      v_texcoord = a_texcoord;
    }`,
  fs: `#version 300 es
    precision mediump float;
    
    in vec2 v_texcoord;
    
    uniform sampler2D u_texture;
    uniform vec2 u_texSize;
    
    out vec4 fragColor;
    
    void main() {
      vec2 cellSize = vec2(16.0 / u_texSize.x, 16.0 / u_texSize.y);
      vec2 uv = v_texcoord + (gl_PointCoord * cellSize);
      vec4 texColor = texture(u_texture, uv);
    
      if (texColor.a < 0.5) {
        discard;
      }
    
      fragColor = texColor;
  }`,
  attribs: {
    a_position: {
      type: "FLOAT",
      size: 3,
      normalize: false
    },
    a_texcoord: {
      type: "FLOAT",
      size: 2,
      normalize: false
    }
  },
  uniforms: {
    u_matrix: {
      method: "uniformMatrix4fv",
      args: [false]
    },
    u_texture: {
      method: "uniform1i"
    },
    u_texSize: {
      method: "uniform2fv"
    },
    u_pointSize: {
      method: "uniform1f"
    },
    u_resolution: {
      method: "uniform2fv"
    }
  }
}

const labels = {
  vs: `#version 300 es
    in vec3 a_position;
    in vec3 a_color;
    in vec2 a_texcoord;
    in vec2 a_worldOffset;
    in float a_stroke;

    uniform mat4 u_matrix;
    uniform float u_pointSize;
    uniform vec2 u_resolution;

    out vec2 v_texcoord;
    out vec3 v_color;
    out float v_stroke;
    out vec2 v_resolution;

    void main() {
      // Common transform (with /60.0 scaling)
      vec4 basePosition = u_matrix * vec4(a_position / 60.0, 1.0);

      // Convert clip space -> window coords
      vec2 windowPos = (basePosition.xy / basePosition.w) * 0.5 + 0.5;
      windowPos *= u_resolution;

      // Add your per-glyph offset in pixel space
      windowPos += a_worldOffset;

      // Snap to nearest pixel
      windowPos = floor(windowPos) + 0.5;

      // Convert back to clip space
      vec2 snappedNDC = (windowPos / u_resolution - 0.5) * 2.0;
      gl_Position = vec4(snappedNDC * basePosition.w, basePosition.z, basePosition.w);
      gl_PointSize = u_pointSize;
      
      v_texcoord = a_texcoord;
      v_color = a_color;
      v_stroke = a_stroke;
      v_resolution = u_resolution;
    }`,
  fs: `#version 300 es
    precision mediump float;
    
    in vec3 v_color;
    in vec2 v_texcoord;
    in float v_stroke;
    in vec2 v_resolution;
    
    uniform sampler2D u_texture;    // Sprite atlas
    uniform sampler2D u_background; // Background snapshot
    uniform vec2 u_texSize;
    
    out vec4 fragColor;
    
    void main() {
      // Each glyph cell is 16x16 px
      vec2 cellSize = vec2(16.0 / u_texSize.x, 16.0 / u_texSize.y);
      vec2 uv = v_texcoord + (gl_PointCoord * cellSize);
      vec4 texColor = texture(u_texture, uv);
    
      if (texColor.a < 0.5) {
        discard; // fully transparent → skip
      }
    
      texColor.rgb *= v_color;
  
      if (v_stroke < 0.5) {
        // If no stroke, discard black pixels
        if (texColor.r == 0.0 && texColor.g == 0.0 && texColor.b == 0.0) {
          discard;
        }
      } else {
        // If stroke, replace black pixels with background color
        if (texColor.r == 0.0 && texColor.g == 0.0 && texColor.b == 0.0) {
          vec2 bgUV = gl_FragCoord.xy / v_resolution;
          vec4 bgColor = texture(u_background, bgUV);
          texColor = bgColor;
        }
      }
      
      fragColor = texColor;
  }`,
  attribs: {
    a_position: {
      type: "FLOAT",
      size: 3,
      normalize: false
    },
    a_color: {
      type: "UNSIGNED_BYTE",
      size: 3,
      normalize: true
    },
    a_texcoord: {
      type: "FLOAT",
      size: 2,
      normalize: false
    },
    a_worldOffset: {
      type: "FLOAT",
      size: 2,
      normalize: false
    },
    a_stroke: {
      type: "FLOAT",
      size: 1,
      normalize: false
    }
  },
  uniforms: {
    u_matrix: {
      method: "uniformMatrix4fv",
      args: [false]
    },
    u_texture: {
      method: "uniform1i"
    },
    u_texSize: {
      method: "uniform2fv"
    },
    u_pointSize: {
      method: "uniform1f"
    },
    u_resolution: {
      method: "uniform2fv"
    },
    u_background: {
      method: "uniform1i"
    }
  }
}

const mesh = {
  vs: `#version 300 es
    precision lowp float;

    in vec3 a_position;
    in vec3 a_normal;
    in vec2 a_texcoord;

    uniform mat4 u_matrix;
    uniform mat3 u_normalMatrix;
    uniform vec3 u_lightDirection;

    out vec2 v_texcoord;
    out vec3 v_lightIntensity;
    out vec3 v_normal;
    out vec3 v_lightDirection;

    void main() {
        gl_Position = u_matrix * vec4(a_position, 1.0);

        // Normalize the normal
        v_normal = normalize(u_normalMatrix * a_normal);

        // Pass the texture coordinates
        v_texcoord = a_texcoord;

        // Transform light direction into the same space as the normals
        vec3 transformedLightDirection = normalize(mat3(u_matrix) * u_lightDirection);

        // Compute diffuse lighting
        float diffuse = max(dot(v_normal, transformedLightDirection), 0.0);

        // Adjust ambient light slightly
        float ambient = 0.4;
        v_lightIntensity = vec3(diffuse + ambient);
        v_lightDirection = transformedLightDirection;
    }

    `,
  fs: `#version 300 es
    precision highp float;

    in vec2 v_texcoord;
    in vec3 v_lightIntensity;
    in vec3 v_normal;
    in vec3 v_lightDirection;

    uniform sampler2D u_normalTexture;

    out vec4 outColor;

    void main() {
      // Sample base color texture
      vec4 baseColor = vec4(1.0, 1.0, 1.0, 1.0);
      
      // Sample and adjust the normal map
      vec3 normalMap = texture(u_normalTexture, v_texcoord).rgb * 2.5 - 1.0;
      float normalScale = 0.6; // 0.6
      vec3 adjustedNormalMap = normalMap * normalScale;

      // Combine and normalize the normals
      //vec3 normal = normalize(v_normal + adjustedNormalMap);
      vec3 normal = normalize(mix(v_normal, adjustedNormalMap, 0.5)); 

      // Compute diffuse lighting
      float diffuse = max(dot(normal, v_lightDirection), 0.0);
      diffuse = mix(0.1, diffuse * 0.7, 0.5); // Soften gradients

      // Adjust specular highlights
      float reflectance = mix(0.04, 1.0, max(0.8, 0.2));
      vec3 specular = vec3(reflectance) * (diffuse * diffuse); // Lower exponent for softer highlights

      // Add ambient lighting
      vec3 ambient = vec3(0.4); // Slightly increased

      // Blend base color with bumpmap for variation
      vec3 blendedBaseColor = mix(baseColor.rgb, normalMap * 0.9 + 0.2, 0.2);

      // Combine all components
      vec3 finalColor = (blendedBaseColor * (v_lightIntensity * diffuse + ambient)) + specular;

      // Output final color
      outColor = vec4(finalColor, baseColor.a);
    }`,
  attribs: {
    a_position: {
      type: "FLOAT",
      size: 3,
      normalize: false
    },
    a_normal: {
      type: "FLOAT",
      size: 3,
      normalize: true
    },
    a_texcoord: {
      type: "FLOAT",
      size: 2,
      normalize: false
    }
  },
  uniforms: {
    u_matrix: {
      method: "uniformMatrix4fv",
      args: [false]
    },
    u_normalMatrix: {
      method: "uniformMatrix3fv",
      args: [false]
    },
    u_baseColorTexture: {
      method: "uniform1i"
    },
    u_normalTexture: {
      method: "uniform1i"
    },
    u_lightDirection: {
      method: "uniform3fv"
    }
  }
}

export { basic, labels, mesh, tex };

