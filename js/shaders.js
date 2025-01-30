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
    in vec3 a_color;
    in vec2 a_texcoord;
    in vec2 a_worldOffset;

    uniform mat4 u_matrix;
    uniform float u_pointSize;
    uniform vec2 u_resolution;

    out vec2 v_texcoord;
    out vec2 v_worldOffset;
    out vec3 v_color;

    void main() {
      // Transform position to clip space
      vec4 worldPosition = u_matrix * vec4(a_position/60.0, 1.0);

      // Convert pixel offsets to clip space, scaling by worldPosition.w for depth correction
      vec2 offsetInClipSpace = (a_worldOffset / u_resolution) * 2.0 * worldPosition.w;

      // Apply the offset in clip space
      gl_Position = worldPosition + vec4(offsetInClipSpace, 0.0, 0.0);

      gl_PointSize = u_pointSize;
      v_texcoord = a_texcoord;
      v_color = a_color;
      v_worldOffset = a_worldOffset;
    }`,
  fs: `#version 300 es
    precision mediump float;

    in vec2 v_worldOffset;
    in vec3 v_color;
    in vec2 v_texcoord;
    uniform sampler2D u_texture; // Sprite atlas
    uniform vec2 u_texSize;
    out vec4 fragColor;

    void main() {
      vec2 uvScale = vec2(16.0 / u_texSize.x, 16.0 / u_texSize.y);
      //vec2 uv = v_texcoord + (gl_PointCoord * uvScale); // Adjust UV mapping
      vec2 uv = v_texcoord + (gl_PointCoord * (uvScale - vec2(1.0) / u_texSize));
      
      vec4 texColor = texture(u_texture, uv);
      
      // Optional: Discard transparent fragments for correct blending
      if (texColor.a < 0.1) discard;

      fragColor = texColor;
      if (v_worldOffset.x > 0.0) fragColor = vec4(v_color, 1.0);
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
        float ambient = 0.6;
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
    uniform float u_metallicFactor;
    uniform float u_roughnessFactor;

    out vec4 outColor;

    void main() {
      // Sample base color texture
      vec4 baseColor = vec4(1.0, 1.0, 1.0, 1.0);
      
      // Sample and adjust the normal map
      vec3 normalMap = texture(u_normalTexture, v_texcoord).rgb * 2.5 - 1.0;
      float normalScale = 0.6; // 0.6
      vec3 adjustedNormalMap = normalMap * normalScale;

      // Combine and normalize the normals
      vec3 normal = normalize(v_normal + adjustedNormalMap);

      // Transform light direction into the same space as the normals
      vec3 transformedLightDirection = normalize(v_lightDirection);

      // Compute diffuse lighting
      float diffuse = max(dot(normal, transformedLightDirection), 0.0);
      diffuse = mix(0.1, diffuse * 0.9, 0.5); // Soften gradients

      // Adjust specular highlights
      float reflectance = mix(0.04, 1.0, max(0.8, 0.2));
      vec3 specular = vec3(reflectance) * pow(diffuse, 8.0); // Lower exponent for softer highlights

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
    u_metallicFactor: {
      method: "uniform1f"
    },
    u_roughnessFactor: {
      method: "uniform1f"
    },
    u_lightDirection: {
      method: "uniform3fv"
    }
  }
}

export { basic, mesh, tex };
