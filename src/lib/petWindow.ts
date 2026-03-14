import {
  PhysicalPosition,
  Window,
  availableMonitors,
  getCurrentWindow,
  type Monitor,
} from "@tauri-apps/api/window";

const PET_WINDOW_LABEL = "pet";
const WINDOW_EDGE_PADDING = 16;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function warn(tag: string, error: unknown) {
  console.warn(`[${tag}]`, error);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeWorkArea(monitor: Monitor): Rect {
  return {
    x: monitor.workArea.position.x,
    y: monitor.workArea.position.y,
    width: monitor.workArea.size.width,
    height: monitor.workArea.size.height,
  };
}

function overlapArea(left: Rect, right: Rect) {
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) -
      Math.max(left.x, right.x),
  );
  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) -
      Math.max(left.y, right.y),
  );
  return width * height;
}

function distanceToRect(pointX: number, pointY: number, rect: Rect) {
  const nearestX = clamp(pointX, rect.x, rect.x + rect.width);
  const nearestY = clamp(pointY, rect.y, rect.y + rect.height);
  return Math.hypot(pointX - nearestX, pointY - nearestY);
}

function pickBestWorkArea(windowRect: Rect, workAreas: Rect[]) {
  const bestOverlap = workAreas
    .map((area) => ({ area, overlap: overlapArea(windowRect, area) }))
    .sort((left, right) => right.overlap - left.overlap)[0];

  if (bestOverlap && bestOverlap.overlap > 0) {
    return bestOverlap.area;
  }

  const centerX = windowRect.x + windowRect.width / 2;
  const centerY = windowRect.y + windowRect.height / 2;

  return workAreas
    .map((area) => ({
      area,
      distance: distanceToRect(centerX, centerY, area),
    }))
    .sort((left, right) => left.distance - right.distance)[0]?.area;
}

function clampAxis(
  position: number,
  areaStart: number,
  areaLength: number,
  windowLength: number,
) {
  const freeSpace = areaLength - windowLength;
  if (freeSpace <= 0) {
    return areaStart + Math.round(freeSpace / 2);
  }

  const min = areaStart + Math.min(WINDOW_EDGE_PADDING, freeSpace);
  const max = areaStart + Math.max(freeSpace - WINDOW_EDGE_PADDING, 0);
  if (max < min) {
    return areaStart + Math.round(freeSpace / 2);
  }
  return clamp(position, min, max);
}

export function clampWindowRectToVisibleArea(
  windowRect: Rect,
  workAreas: Rect[],
) {
  if (workAreas.length === 0) {
    return {
      x: windowRect.x,
      y: windowRect.y,
      changed: false,
    };
  }

  const targetArea = pickBestWorkArea(windowRect, workAreas);
  if (!targetArea) {
    return {
      x: windowRect.x,
      y: windowRect.y,
      changed: false,
    };
  }

  const x = clampAxis(
    windowRect.x,
    targetArea.x,
    targetArea.width,
    windowRect.width,
  );
  const y = clampAxis(
    windowRect.y,
    targetArea.y,
    targetArea.height,
    windowRect.height,
  );

  return {
    x,
    y,
    changed: x !== windowRect.x || y !== windowRect.y,
  };
}

async function resolvePetWindow() {
  try {
    return await Window.getByLabel(PET_WINDOW_LABEL);
  } catch (error) {
    warn("petWindow:getByLabel", error);
    return null;
  }
}

export async function repairPetWindowPosition(
  targetWindow = getCurrentWindow(),
) {
  try {
    const [position, size, monitors] = await Promise.all([
      targetWindow.outerPosition(),
      targetWindow.outerSize(),
      availableMonitors(),
    ]);

    const nextPosition = clampWindowRectToVisibleArea(
      {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
      },
      monitors.map(normalizeWorkArea),
    );

    if (!nextPosition.changed) {
      return false;
    }

    await targetWindow.setPosition(
      new PhysicalPosition(nextPosition.x, nextPosition.y),
    );
    return true;
  } catch (error) {
    warn("petWindow:repair", error);
    return false;
  }
}

export async function bringPetWindowOnScreen() {
  const petWindow = await resolvePetWindow();
  if (!petWindow) {
    return false;
  }

  try {
    await petWindow.show();
  } catch (error) {
    warn("petWindow:show", error);
  }

  return await repairPetWindowPosition(petWindow);
}
