"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Maximize2, RotateCcw } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { auth } from "@/lib/firebase";

type ModelFile = { id: string; fileName: string; contentType?: string };
type Props = { quoteId: string; file: ModelFile | null };
type ViewerResources = { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; container: HTMLDivElement };

function disposeMaterial(material: THREE.Material) {
    const candidate = material as THREE.Material & Record<string, unknown>;
    for (const value of Object.values(candidate)) {
        if (value && typeof value === "object" && "isTexture" in value && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
    }
    material.dispose();
}

function disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        (Array.isArray(child.material) ? child.material : [child.material]).forEach(disposeMaterial);
    });
}

function removeModel(resources: ViewerResources, model: THREE.Object3D | null) {
    if (!model) return;
    resources.scene.remove(model);
    disposeObject(model);
}

export default function ModelViewer({ quoteId, file }: Props) {
    const canvasHostRef = useRef<HTMLDivElement>(null);
    const resourcesRef = useRef<ViewerResources | null>(null);
    const modelRef = useRef<THREE.Object3D | null>(null);
    const resetRef = useRef<(() => void) | null>(null);
    const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [error, setError] = useState("");

    // Renderer/canvas/scene are owned by this mounted viewer, not by each model file.
    useEffect(() => {
        const container = canvasHostRef.current;
        if (!container) return;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        if (renderer.domElement.parentNode !== container) container.appendChild(renderer.domElement);
        const scene = new THREE.Scene(); scene.background = new THREE.Color("#0B0B0F");
        const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100000);
        const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
        scene.add(new THREE.HemisphereLight(0xffffff, 0x202030, 2.2));
        const keyLight = new THREE.DirectionalLight(0xffd7ea, 3); keyLight.position.set(3, 5, 4); scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0x4f8cff, 1.5); fillLight.position.set(-4, 2, -3); scene.add(fillLight);
        const resources: ViewerResources = { renderer, scene, camera, controls, container }; resourcesRef.current = resources;
        const resize = () => { const width = container.clientWidth; const height = Math.max(300, container.clientHeight); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); };
        const observer = new ResizeObserver(resize); observer.observe(container); resize();
        let frame = 0; const animate = () => { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(animate); }; animate();
        return () => {
            cancelAnimationFrame(frame); observer.disconnect(); removeModel(resources, modelRef.current); modelRef.current = null;
            resetRef.current = null; controls.dispose(); renderer.renderLists.dispose(); renderer.dispose(); resourcesRef.current = null;
            // This is a Three-owned canvas in a dedicated, otherwise-empty host. The guard makes Strict Mode cleanup idempotent.
            if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
        };
    }, []);

    useEffect(() => {
        const resources = resourcesRef.current;
        const canvasHost = canvasHostRef.current;
        if (!resources || !canvasHost || !file) { setState("idle"); setError(""); return; }
        const abortController = new AbortController(); let cancelled = false;
        removeModel(resources, modelRef.current); modelRef.current = null; setState("loading"); setError("");
        const fit = (object: THREE.Object3D) => { const box = new THREE.Box3().setFromObject(object); const center = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3()); const max = Math.max(size.x, size.y, size.z) || 1; object.position.sub(center); resources.camera.position.set(max * 1.5, max * 1.1, max * 1.5); resources.camera.near = max / 1000; resources.camera.far = max * 100; resources.camera.updateProjectionMatrix(); resources.controls.target.set(0, 0, 0); resources.controls.update(); };
        resetRef.current = () => { if (modelRef.current) fit(modelRef.current); };
        const load = async () => {
            try {
                const user = auth.currentUser; if (!user) throw new Error("Admin session unavailable");
                const response = await fetch(`/api/admin/3d-printing/quotes/${encodeURIComponent(quoteId)}/files/${encodeURIComponent(file.id)}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store", signal: abortController.signal });
                if (!response.ok) throw new Error(response.status === 404 ? "File is not available in private storage" : "File request failed");
                const buffer = await response.arrayBuffer(); if (cancelled) return;
                const extension = file.fileName.toLowerCase().split(".").pop();
                const model = extension === "3mf" ? new ThreeMFLoader().parse(buffer) : new THREE.Mesh(new STLLoader().parse(buffer), new THREE.MeshStandardMaterial());
                model.traverse((child) => { if (child instanceof THREE.Mesh) { disposeMaterial(child.material as THREE.Material); child.material = new THREE.MeshStandardMaterial({ color: "#FF4FA3", metalness: 0.18, roughness: 0.48 }); } });
                modelRef.current = model; resources.scene.add(model); fit(model); setState("ready");
            } catch (cause) {
                if (!cancelled && !(cause instanceof DOMException && cause.name === "AbortError")) { setError(cause instanceof Error ? cause.message : "Model request failed"); setState("error"); }
            }
        };
        void load();
        return () => { cancelled = true; abortController.abort(); resetRef.current = null; removeModel(resources, modelRef.current); modelRef.current = null; };
    }, [quoteId, file]);

    return <div className="overflow-hidden rounded-[26px] bg-[#0B0B0F] shadow-xl"><div className="relative aspect-[16/10] min-h-[300px] w-full"><div ref={canvasHostRef} className="absolute inset-0" />{state === "loading" && <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-300"><Loader2 className="animate-spin text-pink-400" size={18}/>กำลังโหลดโมเดล 3D...</div>}{state === "error" && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-sm text-red-200"><p>ไม่สามารถแสดงโมเดลนี้ได้</p><p className="mt-2 text-xs text-slate-400">{file?.fileName}</p><p className="mt-1 text-xs text-slate-500">{error}</p></div>}{state === "idle" && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-sm text-slate-400"><p>ยังไม่มีไฟล์ 3D สำหรับแสดงผล</p><p className="mt-2 text-xs text-slate-500">รองรับ STL และ 3MF</p></div>}</div>{state === "ready" && <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-slate-400"><span>ลากเพื่อหมุน · scroll เพื่อ zoom · right-drag เพื่อ pan</span><div className="flex gap-2"><button onClick={() => resetRef.current?.()} className="rounded-lg bg-white/10 p-2 hover:bg-white/20" title="Fit model"><Maximize2 size={15}/></button><button onClick={() => resetRef.current?.()} className="rounded-lg bg-white/10 p-2 hover:bg-white/20" title="Reset view"><RotateCcw size={15}/></button></div></div>}</div>;
}
