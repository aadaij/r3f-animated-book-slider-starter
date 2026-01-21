// turotiral: https://www.youtube.com/watch?v=b7a_Y1Ja6js

import { useMemo, useRef } from "react";
import {
  Bone,
  BoxGeometry,
  Float32BufferAttribute,
  MathUtils,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import { useAtom } from "jotai";
import { pages, pageAtom } from "./UI";
import { useHelper, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";

const easingFactor = 0.5;
const insideCurveStrength = 0.15;

const setTextureColorSpace = (texture, colorSpace) => {
  if (!texture) {
    return;
  }
  texture.colorSpace = colorSpace;
  texture.needsUpdate = true;
};

const PAGE_WIDTH = 1.48;
const PAGE_HEIGHT = 2.1;
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

const pageGeometry = new BoxGeometry(
  PAGE_WIDTH,
  PAGE_HEIGHT,
  PAGE_DEPTH,
  PAGE_SEGMENTS,
  2,
);

pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes = [];
const skinWeights = [];

for (let i = 0; i < position.count; i++) {
  // all vertices
  vertex.fromBufferAttribute(position, i);
  const x = vertex.x;
  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH));
  let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;

  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
}

pageGeometry.setAttribute(
  "skinIndex",
  new Uint16BufferAttribute(skinIndexes, 4),
);

pageGeometry.setAttribute(
  "skinWeight",
  new Float32BufferAttribute(skinWeights, 4),
);

// page materials
const pageMaterials = [
  new MeshStandardMaterial({
    color: "#fff",
  }),
  new MeshStandardMaterial({
    color: "#fff",
  }),
  new MeshStandardMaterial({
    color: "#fff",
  }),
  new MeshStandardMaterial({
    color: "#fff",
  }),
];

pages.forEach((page) => {
  useTexture.preload(`/textures/${page.front}.jpg`);
  useTexture.preload(`/textures/${page.back}.jpg`);
});

const Page = ({ number, front, back, page, opened, bookClosed, ...props }) => {
  const [picture, picture2] = useTexture([
    `/textures/${front}.jpg`,
    `/textures/${back}.jpg`,
  ]);
  useMemo(() => {
    setTextureColorSpace(picture, SRGBColorSpace);
    setTextureColorSpace(picture2, SRGBColorSpace);
  }, [picture, picture2]);
  const group = useRef();

  const skinnedMeshRef = useRef();

  const manualSkinnedMesh = useMemo(() => {
    const bones = [];
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      let bone = new Bone();
      bones.push(bone);
      if (i === 0) {
        bone.position.x = 0;
      } else {
        bone.position.x = SEGMENT_WIDTH;
      }

      if (i > 0) {
        bones[i - 1].add(bone);
      }
    }
    const skeleton = new Skeleton(bones);

    const materials = [
      ...pageMaterials,
      new MeshStandardMaterial({
        color: "#fff",
        map: picture,
        roughness: 1,
        envMapIntensity: 0.2,
      }),
      new MeshStandardMaterial({
        color: "#fff",
        map: picture2,
        roughness: 1,
        envMapIntensity: 0.2,
      }),
    ];
    const mesh = new SkinnedMesh(pageGeometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustcumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, [number, picture, picture2]);

  // useHelper(skinnedMeshRef, SkeletonHelper, "cyan");

  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) {
      return;
    }

    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
    if (!bookClosed) {
      targetRotation += MathUtils.degToRad(number * 0.8);
    }

    const bones = skinnedMeshRef.current.skeleton.bones;
    for (let i = 1; i < bones.length; i++) {
      const target = i === 0 ? group.current : bones[i];

      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      let rotationAngle =
        insideCurveStrength * insideCurveIntensity * targetRotation;
      if (bookClosed) {
        if (i === 0) {
          rotationAngle = targetRotation;
        } else {
          rotationAngle = 0;
        }
      }
      easing.dampAngle(
        target.rotation,
        "y",
        rotationAngle,
        easingFactor,
        delta,
      );
    }
  });

  return (
    <group {...props} ref={group}>
      <primitive
        object={manualSkinnedMesh}
        ref={skinnedMeshRef}
        position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH}
      />
    </group>
  );
};

export const Book = ({ ...props }) => {
  const [page] = useAtom(pageAtom);
  return (
    <group {...props} rotation-y={Math.PI / 2}>
      {[...pages].map((pageData, index) => (
        <Page
          key={index}
          page={page}
          number={index}
          opened={page > index}
          bookClosed={page === 0 || page === pages.length}
          {...pageData}
        />
      ))}
    </group>
  );
};
