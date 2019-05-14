import {mat4, mat3, quat, vec4, vec3} from "gl-matrix"
import * as Filament from "./filament/filament.js"


function clamp(v, least, most) {
  return Math.max(Math.min(most, v), least);
}

/// packSnorm16 ::function:: Converts a float in [-1, +1] into a half-float.
/// value ::argument:: float
/// ::retval:: half-float
function packSnorm16(value) {
  return Math.round(clamp(value, -1.0, 1.0) * 32767.0);
}

function packTangentFrame(quatOut, m)
{
  const t = [m[0],m[1],m[2]];
  const b = [m[3],m[4],m[5]];
  const n = [m[6],m[7],m[8]];

  const nt = vec3.cross(vec3.create(), n,t);
  const basisMtx= mat3.fromValues(
    t[0],t[1],t[2],
    nt[0],nt[1],nt[2],
    m[6],m[7],m[8]
  )

  quat.fromMat3(quatOut, basisMtx);
  
  quat.normalize(quatOut, quatOut);
  quat.scale(quatOut, quatOut, quatOut[3]<0.0 ? -1 : +1);

  // Ensure w is never 0.0
  const epsilon = 0.000015
  if (quatOut[3] < epsilon) {
      quatOut[3]= epsilon;

      const factor = Math.sqrt(1.0 -  epsilon * epsilon);
      quatOut[0] *= factor;
      quatOut[1] *= factor;
      quatOut[2] *= factor;
  }

  // If there's a reflection ((n x t) . b <= 0), make sure w is negative
  const tn = vec3.cross(vec3.create(), t,n);
  if (vec3.dot(tn, b) < 0) {
    quat.scale(quatOut, quatOut,-1);
  }

  return quatOut;
}

const animationLoop = (f)=>{
  f();

  window.requestAnimationFrame(()=>{
    animationLoop(f);
  });      
}


Filament.init([
  "filamat/vcolor.filamat",
  "filamat/lit.filamat"
], () => {

  const canvas = document.getElementById("canvas");
  const engine = Filament.Engine.create(canvas);
  const transformManager = engine.getTransformManager();

  const scene = engine.createScene();
  const swapChain = engine.createSwapChain();
  const renderer = engine.createRenderer();
  const camera = engine.createCamera();
  const view = engine.createView();
  view.setCamera(camera);
  view.setScene(scene);
  view.setClearColor([0.0, 0.1, 0.2, 1.0]);
  const positions = new Float32Array([
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,
    
    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,
    
    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,
    
    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,
    
    // Right face
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,
    
    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0,
  ]);


  const indices  = new Uint16Array([
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23,   // left
  ]);


  const resizeViewport = () => {
    
    const width = canvas.width;
    const height = canvas.height;
    view.setViewport([0, 0, width, height]);
    camera.setProjectionFov(45, width / height, 1.0, 10.0, Filament.Camera$Fov.VERTICAL);
  }

  window.addEventListener("resize", resizeViewport);
  resizeViewport();

  const eye = [0, 0, 4];
  const center = [0, 0, 0];
  const up = [0, 1, 0];
  camera.lookAt(eye, center, up);

  const nverts = positions.length/3;

  const mZPos = mat3.fromValues(1,0,0,  0,1,0,  0,0,-1 );
  const mZNeg = mat3.fromValues(1,0,0,  0,1,0,  0,0,+1 );
  const mYPos = mat3.fromValues(0,1,0,  0,0,1,  0,-1,0 );
  const mYNeg = mat3.fromValues(0,1,0,  0,0,1,  0,+1,0 );
  const mXPos = mat3.fromValues(0,0,1,  0,1,0,  -1,0,0 );
  const mXNeg = mat3.fromValues(0,0,1,  0,1,0,  +1,0,0 );

  const basis = [
    mZPos,
    mZPos,
    mZPos,
    mZPos,
     
    mZNeg,
    mZNeg,
    mZNeg,
    mZNeg,
     
    mYPos,
    mYPos,
    mYPos,
    mYPos,
     
    mYNeg,
    mYNeg,
    mYNeg,
    mYNeg,
     
    mXPos,
    mXPos,
    mXPos,
    mXPos,
     
    mXNeg,
    mXNeg,
    mXNeg,
    mXNeg,
  ];

  const packedBasis = new Int16Array(nverts*4);
  const basisQuat= quat.create();

  for(let i=0;i<nverts;i++) {
    packTangentFrame(basisQuat,basis[i]);
    for(let j=0;j<4;j++) {
      packedBasis[i*4+j] = packSnorm16(basisQuat[j]);
    }
  }

  const colors = new Float32Array([
    // Front face
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    
    // Back face
    0.0, 1.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    
    // Top face
    1.0, 0.0, 1.0, 1.0,
    1.0, 0.0, 1.0, 1.0,
    1.0, 0.0, 1.0, 1.0,
    1.0, 0.0, 1.0, 1.0,
    
    // Bottom face
    0.0, 1.0, 1.0, 1.0,
    0.0, 1.0, 1.0, 1.0,
    0.0, 1.0, 1.0, 1.0,
    0.0, 1.0, 1.0, 1.0,
    
    // Right face
    0.0, 0.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    
    // Left face
    0.0, 0.5, 1.0, 1.0,
    0.0, 0.5, 1.0, 1.0,
    0.0, 0.5, 1.0, 1.0,
    0.0, 0.5, 1.0, 1.0,
  ]);

  const nind = indices.length;

  const vb = Filament.VertexBuffer.Builder()
  .vertexCount(nverts)
  .bufferCount(2)
  .attribute(Filament.VertexAttribute.POSITION, 0, Filament.VertexBuffer$AttributeType.FLOAT3, 0, 0)
  .attribute(Filament.VertexAttribute.TANGENTS,1, Filament.VertexBuffer$AttributeType.SHORT4, 0, 0)
  .normalized(Filament.VertexAttribute.TANGENTS)
  .build(engine);

  vb.setBufferAt(engine, 0, positions);
  vb.setBufferAt(engine, 1, geom.tangents);

  const ib = Filament.IndexBuffer.Builder()
    .indexCount(nind)
    .bufferType(Filament.IndexBuffer$IndexType.USHORT)
    .build(engine);


  ib.setBuffer(engine, indices);

  const mat = engine.createMaterial('filamat/lit.filamat');
  const matinst = mat.getDefaultInstance();
  const entity = Filament.EntityManager.get().create();
  matinst.setColorParameter('baseColor', Filament.RgbType.sRGB, [1,1,1]);
        
  
  Filament.RenderableManager.Builder(1)
      .boundingBox({ center: [-20, -20, -20], halfExtent: [20,20,20] })
      .material(0, matinst)
      .geometry(0, Filament.RenderableManager$PrimitiveType.TRIANGLES, vb, ib)
      .build(engine,entity);

  scene.addEntity(entity);


  const light0 = Filament.EntityManager.get().create();
  Filament.LightManager.Builder(Filament.LightManager$Type.DIRECTIONAL)
    .color([0,1,0])
    .intensity(115000)
    .direction([0.0, 0.0, -1.0])
    .build(engine, light0);

  scene.addEntity(light0);

  const xformMtx = mat4.create();
  let rotationSpeed = Math.PI*0.2;

  const drawFrame = ()=> {
    var d = new Date();
    var timeSecs = d.getTime()/1000.0;

    mat4.fromRotation(xformMtx, timeSecs*rotationSpeed, [0, 1, 0]);
    const inst = transformManager.getInstance(entity);
    transformManager.setTransform(inst, xformMtx);
    inst.delete();
    

    renderer.render(swapChain, view);
  }

  animationLoop(drawFrame);
});
