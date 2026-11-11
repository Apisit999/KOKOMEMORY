"use client";

// Interactive 3D hero object: an iridescent glass "lens" (ring + orb) lit in the
// brand gradient (pink → lilac → sky). Follows the pointer, pauses off-screen,
// and stays still when the visitor prefers reduced motion.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

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
        scene.environmentIntensity = 0.45;

        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        camera.position.set(0, 0, 8);

        // Brand lights
        const pink = new THREE.PointLight(0xd98aae, 420, 30);
        pink.position.set(-4, 2, 3);
        const sky = new THREE.PointLight(0x7fb2ee, 420, 30);
        sky.position.set(4, -2, 3);
        const lilac = new THREE.PointLight(0xa79bd8, 300, 30);
        lilac.position.set(0, 4, -2);
        scene.add(pink, sky, lilac, new THREE.AmbientLight(0xffffff, 0.15));

        const group = new THREE.Group();
        scene.add(group);

        // Lens ring
        const ringMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xf4f1fb, metalness: 0.35, roughness: 0.18,
            clearcoat: 1, clearcoatRoughness: 0.05,
            iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 800],
        });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.36, 96, 200), ringMaterial);
        group.add(ring);

        // Glass orb inside the ring
        const orbMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xe6e1f7, metalness: 0.1, roughness: 0.08,
            transmission: 0.35, thickness: 1.2, ior: 1.45,
            iridescence: 0.6, clearcoat: 1,
        });
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.95, 96, 96), orbMaterial);
        group.add(orb);

        // Small satellite pearls
        const pearlMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, iridescence: 1, clearcoat: 1 });
        const pearls = [0, 1, 2].map((i) => {
            const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.16 - i * 0.03, 48, 48), pearlMaterial);
            scene.add(pearl);
            return pearl;
        });

        group.rotation.set(0.35, -0.5, 0);

        const resize = () => {
            const { clientWidth: w, clientHeight: h } = mount;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
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
            const t = animate ? clock.getElapsedTime() : 0;
            if (animate) {
                group.rotation.y += (pointer.x * 0.6 - 0.5 + Math.sin(t * 0.3) * 0.15 - group.rotation.y) * 0.04;
                group.rotation.x += (pointer.y * 0.4 + 0.35 - group.rotation.x) * 0.04;
                group.position.y = Math.sin(t * 0.8) * 0.08;
            }
            pearls.forEach((pearl, i) => {
                const a = t * (0.35 + i * 0.12) + i * 2.1;
                pearl.position.set(Math.cos(a) * (1.8 + i * 0.2), Math.sin(a * 1.3) * 0.9, Math.sin(a) * 1.0);
            });
            renderer.render(scene, camera);
        };
        render();

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("pointermove", onPointer);
            resizeObserver.disconnect();
            intersection.disconnect();
            scene.traverse((object) => {
                if (object instanceof THREE.Mesh) object.geometry.dispose();
            });
            [ringMaterial, orbMaterial, pearlMaterial].forEach((m) => m.dispose());
            envTexture.dispose();
            pmrem.dispose();
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    return <div ref={mountRef} className="studio-3d" aria-hidden="true" />;
}
