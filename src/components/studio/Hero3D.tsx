"use client";

// Interactive 3D hero: a pearl-white instant camera (the brand's core service).
// Every few seconds the flash fires and a real KOKO photo slides out of the print
// slot — capture → print → memory. Other prints float calmly behind the camera so
// nothing ever passes through it. Lit in the brand gradient (pink → lilac → sky).
// Follows the pointer, pauses off-screen, stays still for reduced motion.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const PHOTOS = ["/gallery/1.jpg", "/gallery/2.jpg", "/about/about2.png", "/hero/wedding.jpg"];
const CYCLE = 5.5; // seconds per printed photo

export default function Hero3D({ moving = true }: { moving?: boolean }) {
    const mountRef = useRef<HTMLDivElement>(null);
    const movingRef = useRef(moving);
    useEffect(() => { movingRef.current = moving; }, [moving]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        } catch {
            return; // No WebGL: the CSS gradient fallback behind the canvas stays visible.
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTexture;
        scene.environmentIntensity = 0.7;

        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        camera.position.set(0, 0, 11);

        // Lights: soft white key + brand-coloured rims
        const key = new THREE.DirectionalLight(0xffffff, 1.6);
        key.position.set(-3, 5, 6);
        const pink = new THREE.PointLight(0xd98aae, 260, 30);
        pink.position.set(-5, 1, 3);
        const sky = new THREE.PointLight(0x7fb2ee, 260, 30);
        sky.position.set(5, -1, 3);
        const lilac = new THREE.PointLight(0xa79bd8, 200, 30);
        lilac.position.set(0, 4, -3);
        scene.add(key, pink, sky, lilac, new THREE.AmbientLight(0xffffff, 0.4));

        const disposables: { dispose: () => void }[] = [];
        const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

        // ---------- Materials ----------
        const bodyMat = keep(new THREE.MeshPhysicalMaterial({ color: 0xf8f7f4, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }));
        const capMat = keep(new THREE.MeshPhysicalMaterial({ color: 0xe8e5f0, roughness: 0.38, clearcoat: 0.8 }));
        const inkMat = keep(new THREE.MeshPhysicalMaterial({ color: 0x1a1a1f, roughness: 0.45, metalness: 0.2, clearcoat: 0.5 }));
        const pearlMat = keep(new THREE.MeshPhysicalMaterial({
            color: 0xf4f1fb, metalness: 0.35, roughness: 0.16, clearcoat: 1,
            iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 800],
        }));
        const chromeMat = keep(new THREE.MeshPhysicalMaterial({ color: 0xc9c4d8, metalness: 1, roughness: 0.22 }));
        const glassMat = keep(new THREE.MeshPhysicalMaterial({ color: 0x15132a, metalness: 0.4, roughness: 0.04, clearcoat: 1, iridescence: 0.6, iridescenceIOR: 1.4 }));
        const shutterMat = keep(new THREE.MeshPhysicalMaterial({ color: 0xd98aae, roughness: 0.3, clearcoat: 1 }));
        const flashMat = keep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1, emissive: new THREE.Color(0xa79bd8), emissiveIntensity: 0.15 }));
        const highlightMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));

        // ---------- Camera ----------
        const cam = new THREE.Group();
        scene.add(cam);

        const body = new THREE.Mesh(keep(new RoundedBoxGeometry(3.3, 2.15, 1.3, 8, 0.34)), bodyMat);
        const cap = new THREE.Mesh(keep(new RoundedBoxGeometry(3.06, 0.32, 1.12, 6, 0.14)), capMat);
        cap.position.y = 1.12;
        cam.add(body, cap);

        // Lens stack, facing +z
        const lens = new THREE.Group();
        lens.position.set(0.05, -0.08, 0.65);
        const lensRing = new THREE.Mesh(keep(new THREE.TorusGeometry(0.78, 0.12, 48, 128)), pearlMat);
        lensRing.position.z = 0.08;
        const barrel = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.7, 0.74, 0.36, 72)), inkMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = 0.12;
        const innerRing = new THREE.Mesh(keep(new THREE.TorusGeometry(0.54, 0.035, 24, 96)), chromeMat);
        innerRing.position.z = 0.31;
        const glass = new THREE.Mesh(keep(new THREE.SphereGeometry(0.52, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2.6)), glassMat);
        glass.rotation.x = Math.PI / 2;
        glass.position.z = 0.12;
        const glint = new THREE.Mesh(keep(new THREE.CircleGeometry(0.07, 24)), highlightMat);
        glint.position.set(-0.17, 0.17, 0.42);
        const glint2 = new THREE.Mesh(keep(new THREE.CircleGeometry(0.03, 16)), highlightMat);
        glint2.position.set(-0.04, 0.27, 0.42);
        lens.add(lensRing, barrel, innerRing, glass, glint, glint2);
        cam.add(lens);

        // Flash window, viewfinder, shutter button, print slot
        const flash = new THREE.Mesh(keep(new RoundedBoxGeometry(0.74, 0.34, 0.1, 4, 0.06)), flashMat);
        flash.position.set(1.0, 0.64, 0.66);
        const finder = new THREE.Mesh(keep(new RoundedBoxGeometry(0.34, 0.26, 0.1, 4, 0.06)), glassMat);
        finder.position.set(-1.12, 0.66, 0.66);
        const shutter = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.19, 0.2, 0.14, 40)), shutterMat);
        shutter.position.set(1.12, 1.33, 0.12);
        const slot = new THREE.Mesh(keep(new RoundedBoxGeometry(2.0, 0.07, 0.12, 2, 0.03)), inkMat);
        slot.position.set(0, -1.02, 0.42);
        cam.add(flash, finder, shutter, slot);

        // ---------- Photos ----------
        const loader = new THREE.TextureLoader();
        const textures = PHOTOS.map((src) => {
            const tex = keep(loader.load(src, (t) => {
                // Crop to a centred square so faces are never stretched
                const img = t.image as HTMLImageElement;
                const r = img.width / img.height;
                t.repeat.set(r > 1 ? 1 / r : 1, r > 1 ? 1 : r);
                t.offset.set((1 - t.repeat.x) / 2, (1 - t.repeat.y) / 2);
            }));
            tex.colorSpace = THREE.SRGBColorSpace;
            return tex;
        });

        const frameGeo = keep(new RoundedBoxGeometry(1.1, 1.32, 0.025, 2, 0.012));
        const photoGeo = keep(new THREE.PlaneGeometry(0.94, 0.94));
        const makePrint = (tex: THREE.Texture, transparent = false) => {
            const paper = keep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.55, clearcoat: 0.3, transparent }));
            const photo = keep(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent }));
            const print = new THREE.Group();
            print.add(new THREE.Mesh(frameGeo, paper));
            const pic = new THREE.Mesh(photoGeo, photo);
            pic.position.set(0, 0.1, 0.014);
            print.add(pic);
            return { print, paper, photo };
        };

        // Calm prints floating behind the camera (never intersect it)
        const floaters = [
            { x: -2.75, y: 1.05, z: -1.3, rz: 0.14, s: 0.86, tex: 0 },
            { x: 2.8, y: 0.85, z: -1.5, rz: -0.12, s: 0.86, tex: 1 },
        ].map((f, i) => {
            const { print } = makePrint(textures[f.tex]);
            print.position.set(f.x, f.y, f.z);
            print.rotation.z = f.rz;
            print.scale.setScalar(f.s);
            scene.add(print);
            return { ...f, print, phase: i * 1.7 };
        });

        // The print that slides out of the slot (child of the camera so it moves with it).
        // It only uses photos the floating prints don't show, so nothing appears twice.
        const EJECT = [2, 3];
        const ejecting = makePrint(textures[EJECT[0]], true);
        ejecting.print.position.set(0, -0.55, 0.36);
        cam.add(ejecting.print);
        let ejectIndex = 0;

        cam.rotation.set(0.1, -0.32, 0);

        const resize = () => {
            const { clientWidth: w, clientHeight: h } = mount;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            // Keep the whole composition in frame on narrow screens
            camera.position.z = w / h < 1 ? 14.5 : 11;
            camera.updateProjectionMatrix();
        };
        resize();
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);

        const pointer = { x: 0, y: 0 };
        const onPointer = (event: PointerEvent) => {
            pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
        };
        window.addEventListener("pointermove", onPointer, { passive: true });

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        let visible = true;
        const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
        intersection.observe(mount);

        const ease = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
        const clock = new THREE.Clock();
        let frame = 0;
        let lastCycle = -1;
        const render = () => {
            frame = requestAnimationFrame(render);
            if (!visible) return;
            const animate = movingRef.current && !reducedMotion.matches;
            const t = animate ? clock.getElapsedTime() : 0;

            if (animate) {
                cam.rotation.y += (pointer.x * 0.45 - 0.32 + Math.sin(t * 0.35) * 0.08 - cam.rotation.y) * 0.05;
                cam.rotation.x += (pointer.y * 0.25 + 0.1 - cam.rotation.x) * 0.05;
                cam.position.y = 0.15 + Math.sin(t * 0.8) * 0.05;
            } else {
                cam.position.y = 0.15;
            }

            floaters.forEach((f) => {
                const s = animate ? t : 0;
                f.print.position.y = f.y + Math.sin(s * 0.7 + f.phase) * 0.06;
                f.print.rotation.y = Math.sin(s * 0.4 + f.phase) * 0.12;
                f.print.rotation.z = f.rz + Math.sin(s * 0.5 + f.phase) * 0.025;
            });

            // Print cycle: flash → slide out → hold → fade, then the next photo
            const cycle = Math.floor(t / CYCLE);
            const p = animate ? (t % CYCLE) / CYCLE : 0.55;
            if (animate && cycle !== lastCycle) {
                lastCycle = cycle;
                ejectIndex = (ejectIndex + 1) % EJECT.length;
                ejecting.photo.map = textures[EJECT[ejectIndex]];
                ejecting.photo.needsUpdate = true;
            }
            flashMat.emissiveIntensity = 0.15 + (p < 0.06 ? (1 - p / 0.06) * 2.5 : 0);
            const out = ease((p - 0.06) / 0.3);          // slide out
            const fade = p > 0.82 ? 1 - (p - 0.82) / 0.18 : 1; // fade away
            ejecting.print.position.y = -0.55 - out * 1.3;
            ejecting.print.rotation.x = -out * 0.12;
            ejecting.paper.opacity = fade;
            ejecting.photo.opacity = fade;

            renderer.render(scene, camera);
        };
        render();

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("pointermove", onPointer);
            resizeObserver.disconnect();
            intersection.disconnect();
            disposables.forEach((d) => d.dispose());
            envTexture.dispose();
            pmrem.dispose();
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    return <div ref={mountRef} className="studio-3d" aria-hidden="true" />;
}
