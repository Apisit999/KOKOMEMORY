"use client";

// Interactive 3D hero: a pearl-white photobooth camera (the brand's core service)
// with real KOKO photos floating out of it as instant prints — capture → print →
// memory. Lit in the brand gradient (pink → lilac → sky). Follows the pointer,
// pauses off-screen, and stays still when the visitor prefers reduced motion.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const PHOTOS = ["/hero/wedding.jpg", "/gallery/1.jpg", "/about/about2.png", "/gallery/2.jpg"];

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
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTexture;
        scene.environmentIntensity = 0.55;

        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        camera.position.set(0, 0, 10);

        // Brand lights
        const pink = new THREE.PointLight(0xd98aae, 380, 30);
        pink.position.set(-4, 2, 4);
        const sky = new THREE.PointLight(0x7fb2ee, 380, 30);
        sky.position.set(4, -2, 4);
        const lilac = new THREE.PointLight(0xa79bd8, 260, 30);
        lilac.position.set(0, 4, -2);
        scene.add(pink, sky, lilac, new THREE.AmbientLight(0xffffff, 0.35));

        const disposables: { dispose: () => void }[] = [];
        const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

        // ---------- Camera ----------
        const cam = new THREE.Group();
        scene.add(cam);

        const bodyMat = keep(new THREE.MeshPhysicalMaterial({ color: 0xf7f6f3, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 }));
        const inkMat = keep(new THREE.MeshPhysicalMaterial({ color: 0x151515, roughness: 0.4, metalness: 0.3, clearcoat: 0.6 }));
        const pearlMat = keep(new THREE.MeshPhysicalMaterial({
            color: 0xf4f1fb, metalness: 0.35, roughness: 0.18, clearcoat: 1,
            iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 800],
        }));
        const glassMat = keep(new THREE.MeshPhysicalMaterial({
            color: 0x9aa6d8, metalness: 0.2, roughness: 0.05, clearcoat: 1, iridescence: 0.7,
        }));

        const body = new THREE.Mesh(keep(new RoundedBoxGeometry(3.2, 2.1, 1.3, 6, 0.32)), bodyMat);
        cam.add(body);

        // Lens: iridescent ring + dark barrel + glass element
        const lensRing = new THREE.Mesh(keep(new THREE.TorusGeometry(0.72, 0.13, 48, 120)), pearlMat);
        lensRing.position.set(0, -0.05, 0.72);
        const barrel = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.62, 0.66, 0.35, 64)), inkMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, -0.05, 0.7);
        const glass = new THREE.Mesh(keep(new THREE.SphereGeometry(0.5, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2)), glassMat);
        glass.rotation.x = Math.PI / 2;
        glass.position.set(0, -0.05, 0.86);
        cam.add(lensRing, barrel, glass);

        // Flash, viewfinder, shutter button
        const flash = new THREE.Mesh(keep(new RoundedBoxGeometry(0.62, 0.3, 0.12, 4, 0.06)), pearlMat);
        flash.position.set(0.95, 0.68, 0.66);
        const finder = new THREE.Mesh(keep(new RoundedBoxGeometry(0.34, 0.26, 0.1, 4, 0.05)), inkMat);
        finder.position.set(-1.1, 0.7, 0.66);
        const shutter = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 40)), pearlMat);
        shutter.position.set(1.05, 1.1, 0);
        // Print slot on top-front edge
        const slot = new THREE.Mesh(keep(new RoundedBoxGeometry(1.9, 0.06, 0.08, 2, 0.02)), inkMat);
        slot.position.set(0, -1.02, 0.5);
        cam.add(flash, finder, shutter, slot);

        // ---------- Floating instant prints with real photos ----------
        const loader = new THREE.TextureLoader();
        const paperMat = keep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, clearcoat: 0.3 }));
        const frameGeo = keep(new RoundedBoxGeometry(1.1, 1.32, 0.03, 2, 0.015));
        const photoGeo = keep(new THREE.PlaneGeometry(0.94, 0.94));
        const prints = PHOTOS.map((src, i) => {
            const tex = keep(loader.load(src));
            tex.colorSpace = THREE.SRGBColorSpace;
            const photoMat = keep(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
            const print = new THREE.Group();
            print.add(new THREE.Mesh(frameGeo, paperMat));
            const photo = new THREE.Mesh(photoGeo, photoMat);
            photo.position.set(0, 0.1, 0.02);
            print.add(photo);
            scene.add(print);
            return { print, phase: (i / PHOTOS.length) * Math.PI * 2 };
        });

        // Tex aspect: crop to square once loaded
        prints.forEach(({ print }) => {
            const photo = print.children[1] as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
            const tex = photo.material.map!;
            const fit = () => {
                const img = tex.image as HTMLImageElement | undefined;
                if (!img?.width) return;
                const r = img.width / img.height;
                tex.repeat.set(r > 1 ? 1 / r : 1, r > 1 ? 1 : r);
                tex.offset.set((1 - tex.repeat.x) / 2, (1 - tex.repeat.y) / 2);
            };
            tex.onUpdate = fit;
        });

        cam.rotation.set(0.12, -0.35, 0);

        const resize = () => {
            const { clientWidth: w, clientHeight: h } = mount;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            // Keep the whole composition in frame on narrow screens
            camera.position.z = w / h < 1 ? 15 : 12.5;
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

        const clock = new THREE.Clock();
        let frame = 0;
        const render = () => {
            frame = requestAnimationFrame(render);
            if (!visible) return;
            const animate = movingRef.current && !reducedMotion.matches;
            const t = animate ? clock.getElapsedTime() : 1.2;
            if (animate) {
                cam.rotation.y += (pointer.x * 0.5 - 0.35 + Math.sin(t * 0.3) * 0.1 - cam.rotation.y) * 0.04;
                cam.rotation.x += (pointer.y * 0.3 + 0.12 - cam.rotation.x) * 0.04;
                cam.position.y = Math.sin(t * 0.8) * 0.06;
            }
            // Prints drift in a slow halo around the camera
            prints.forEach(({ print, phase }) => {
                const a = t * 0.22 + phase;
                print.position.set(Math.cos(a) * 3.1, Math.sin(a) * 1.6 + Math.sin(t * 0.9 + phase) * 0.08, Math.sin(a) * -0.8 - 0.3);
                print.rotation.set(0, -Math.cos(a) * 0.35, Math.sin(a + phase) * 0.18);
            });
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
