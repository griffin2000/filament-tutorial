
import {mat4} from "gl-matrix"
import * as Filament from "./filament/filament.js"
console.log("Start")
Filament.init([], () => {
  console.log("Created");

  const canvas = document.getElementById("canvas");
  const engine = Filament.Engine.create(canvas);

  const scene = engine.createScene();
  const swapChain = engine.createSwapChain();
  const renderer = engine.createRenderer();
  const camera = engine.createCamera();
  const view = engine.createView();
  view.setCamera(camera);
  view.setScene(scene);
  view.setClearColor([0.0, 0.1, 0.2, 1.0]);

  const drawFrame = ()=> {

    renderer.render(swapChain, view);
  }

  const resizeViewport = () => {
    
    const width = canvas.width;
    const height = canvas.height;
    view.setViewport([0, 0, width, height]);
    const aspect = width / height;
    camera.setProjection(Filament.Camera$Projection.ORTHO, -aspect, aspect, -1, 1, 0, 1);
  }
  resizeViewport();

  window.addEventListener("resize", resizeViewport);
  const animationLoop = ()=>{
    drawFrame();
    window.requestAnimationFrame(animationLoop);
  }
  animationLoop();

});
