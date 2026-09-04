import { SuperLoraBaseWidget } from './SuperLoraBaseWidget';
import { WidgetAPI } from './WidgetAPI';
import { TriggerWordStore } from '@/services/TriggerWordStore';
import { SuperLoraTagWidget } from './SuperLoraTagWidget';

export class SuperLoraWidget extends SuperLoraBaseWidget {
  constructor(name: string) {
    super(name);
    this.value = {
      lora: "None",
      enabled: true,
      strength: 1.0,
      strengthClip: 1.0,
      triggerWords: "",
      tag: "General",
      autoFetched: false,
      fetchAttempted: false
    };
    this.hitAreas = {
      enabled: { bounds: [0, 0], onDown: this.onEnabledDown, priority: 60 },
      lora: { bounds: [0, 0], onClick: this.onLoraClick, priority: 10 },
      tag: { bounds: [0, 0], onClick: this.onTagClick, priority: 20 },
      strengthSettings: { bounds: [0, 0], onClick: this.onStrengthSettingsClick, priority: 90 },
      triggerWords: { bounds: [0, 0], onClick: this.onTriggerWordsClick, priority: 85 },
      refresh: { bounds: [0, 0], onClick: this.onRefreshClick, priority: 95 },
      remove: { bounds: [0, 0], onClick: this.onRemoveClick, priority: 100 },
      moveUp: { bounds: [0, 0], onClick: this.onMoveUpClick, priority: 70 },
      moveDown: { bounds: [0, 0], onClick: this.onMoveDownClick, priority: 70 }
    };
  }

  // Bounds for the drag-and-drop handle and the strength slider tracks. These are
  // hit-tested separately from `hitAreas` (see SuperLoraNode.tryStartDrag/handleDragMove)
  // because they need continuous pointer-move tracking, not a single onDown/onClick.
  private _dragHandleBounds: number[] = [0, 0, 0, 0];
  private _strengthSliderBounds: number[] = [0, 0, 0, 0];
  private _strengthClipSliderBounds: number[] = [0, 0, 0, 0];

  draw(ctx: any, node: any, w: number, posY: number, height: number): void {
    const margin = 8;
    const rowHeight = 28;

    ctx.save();
    const innerWidth = Math.max(0, w - margin * 2);
    const clampedHeight = Math.max(0, height);

    ctx.beginPath();
    ctx.rect(margin, posY, innerWidth, clampedHeight);
    ctx.clip();

    const bodyHeight = Math.max(4, height - 4);
    const bodyY = posY + (height >= bodyHeight ? Math.floor((height - bodyHeight) / 2) : 0);
    const cornerRadius = Math.min(6, bodyHeight / 2);

    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.roundRect(margin, bodyY, innerWidth, bodyHeight, cornerRadius || 0);
    ctx.fill();
    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.clip();

    if (!this.value.enabled) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fill();
    }

    ctx.font = "11px 'Segoe UI', Arial, sans-serif";
    ctx.textBaseline = "middle";

    const topPad = node.properties?.showTriggerWords ? 4 : Math.max(4, Math.floor((height - rowHeight) / 2));
    let currentY = posY + topPad;

    this.drawFirstRow(ctx, node, w, currentY, rowHeight, height);

    ctx.restore();
  }

  private drawFirstRow(ctx: any, node: any, w: number, posY: number, rowHeight: number, fullHeight: number): void {
    const margin = 8;
    let posX = margin + 6;
    const midY = rowHeight / 2;

    // Drag-and-drop handle (grip). Press and hold, then drag up/down to reorder -
    // the move up/down arrows still work too, this is just an alternative.
    const handleW = 14;
    {
      const hx = posX;
      const hy = posY;
      ctx.save();
      ctx.globalAlpha *= this.value.enabled ? 0.6 : 0.35;
      ctx.fillStyle = '#aaa';
      const dotR = 1.4;
      const colX = [hx + 4, hx + 9];
      const rowsY = [hy + midY - 6, hy + midY, hy + midY + 6];
      for (const cx of colX) {
        for (const cy of rowsY) {
          ctx.beginPath();
          ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      this._dragHandleBounds = [hx, 0, handleW, fullHeight];
      posX += handleW + 6;
    }

    const toggleSize = 20;
    const toggleY = (rowHeight - toggleSize) / 2;
    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.roundRect(posX, posY + toggleY, toggleSize, toggleSize, 2);
    ctx.fill();
    ctx.strokeStyle = this.value.enabled ? "#1b5e20" : "#3a3a3a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = this.value.enabled ? "#2e7d32" : "";
    ctx.textAlign = "center";
    ctx.font = "12px Arial";
    if (this.value.enabled) {
      ctx.fillText("●", posX + toggleSize / 2, posY + midY);
    }
    this.hitAreas.enabled.bounds = [posX, 0, toggleSize, fullHeight];
    posX += toggleSize + 8;

    const loraWidgets = node.customWidgets?.filter((w: any) => w instanceof SuperLoraWidget) || [];
    const indexInLoras = loraWidgets.indexOf(this as any);
    const lastIndex = loraWidgets.length - 1;
    const showMoveArrows = (loraWidgets.length > 1) && (node?.properties?.showMoveArrows !== false);
    const showStrength = node?.properties?.showStrengthControls !== false;
    const showRemove = node?.properties?.showRemoveButton !== false;

    const arrowSize = 20;
    const sliderWidth = 96;
    const sliderHeight = 20;
    const gearSize = 16;
    const removeSize = 20;
    const gapSmall = 2;
    const gap = 8;

    const rightEdge = node.size[0] - margin;
    let cursorX = rightEdge;
    // Places an element of `width` immediately to the left of the current cursor,
    // returns its left edge, and leaves the cursor there - so the NEXT element
    // placed this way starts exactly where this one ends (no overlap by
    // construction). Callers add their own gap between elements explicitly.
    const placeRTL = (width: number): number => {
      cursorX -= width;
      return cursorX;
    };

    let removeX = -9999;
    let gearX = -9999;
    let strengthX = -9999;
    let strengthClipX = -9999;
    let upX = -9999;
    let downX = -9999;

    if (showRemove) {
      removeX = placeRTL(removeSize);
      cursorX -= gap;
    }
    if (showStrength) {
      // One shared gear icon opens the range/exact-value settings for both sliders.
      gearX = placeRTL(gearSize);
      cursorX -= gap;
      // Model strength slider (rightmost)
      strengthX = placeRTL(sliderWidth);
      cursorX -= gap;
      // Optional CLIP strength slider (to the left) when separate strengths enabled
      if (node?.properties?.showSeparateStrengths) {
        strengthClipX = placeRTL(sliderWidth);
        cursorX -= gap;
      }
    }
    if (showMoveArrows) {
      const leftMostSlider = (showStrength && node?.properties?.showSeparateStrengths)
        ? Math.min(strengthX, strengthClipX)
        : strengthX;
      const arrowRightStart = showStrength ? (leftMostSlider - gap) : (showRemove ? (removeX - gap) : (rightEdge - gap));
      upX = arrowRightStart - arrowSize - 4;
      downX = upX - (arrowSize + 2);
      cursorX -= gap;
    }

    if (node?.properties?.enableTags && node?.properties?.showTagChip !== false) {
      const iconSize = 20;
      const iconY = posY + Math.floor((rowHeight - iconSize) / 2);
      ctx.fillStyle = this.value.enabled ? "#333" : "#2a2a2a";
      ctx.beginPath(); ctx.roundRect(posX, iconY, iconSize, iconSize, 2); ctx.fill();
      ctx.strokeStyle = "#444"; ctx.lineWidth = 1; ctx.stroke();
      // Set the icon font color to golden and dim when disabled
      ctx.fillStyle = "#FFD700"; // Gold color
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "12px Arial";
      ctx.save();
      if (!this.value.enabled) { ctx.globalAlpha *= 0.55; }
      ctx.fillText("🏷", posX + iconSize / 2, posY + midY);
      ctx.restore();
      this.hitAreas.tag.bounds = [posX, 0, iconSize, fullHeight];
      posX += iconSize + 6;
      ctx.font = "12px 'Segoe UI', Arial, sans-serif";
    } else {
      this.hitAreas.tag.bounds = [0,0,0,0];
    }

    const loraLeft = posX;
    const rightMost = [
      showMoveArrows ? downX : null,
      showStrength ? strengthX : null,
      (showStrength && node?.properties?.showSeparateStrengths) ? strengthClipX : null,
      showRemove ? removeX : null
    ].filter(v => typeof v === 'number') as number[];
    const loraMaxRight = (rightMost.length ? Math.min(...rightMost) : rightEdge) - gap;
    const loraWidth = Math.max(100, loraMaxRight - loraLeft);

    // Trigger words get a short, fixed-ish slot (capped) so the LoRA name and the
    // (now wider) strength sliders have more room - the full text is still one click away.
    const showTriggers = !!(node.properties && node.properties.showTriggerWords);
    const trigWidth = showTriggers ? Math.max(50, Math.min(80, Math.floor(loraWidth * 0.3))) : 0;
    const nameWidth = showTriggers ? Math.max(80, loraWidth - trigWidth) : loraWidth;

    ctx.textAlign = "left";
    ctx.font = "12px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = this.value.enabled ? "#fff" : "#888";
    const loraText = this.value.lora === "None" ? "Click to select LoRA..." : this.value.lora;
    const loraDisplay = this.truncateText(ctx, loraText, nameWidth);
    ctx.fillText(loraDisplay, loraLeft, posY + midY);
    this.hitAreas.lora.bounds = [loraLeft, 0, nameWidth, fullHeight];

    const controlsAlpha = this.value.enabled ? 1 : 0.55;
    ctx.save();
    ctx.globalAlpha *= controlsAlpha;

    const triggerLeft = loraLeft + nameWidth;
    if (showTriggers && trigWidth > 0) {
      const hasTrigger = !!(this.value.triggerWords && String(this.value.triggerWords).trim());
      const pillH = 20;
      const pillY = posY + Math.floor((rowHeight - pillH) / 2);
      (this as any)._triggerRect = { x: triggerLeft, y: pillY, w: trigWidth, h: pillH };
      ctx.fillStyle = "#2f2f2f";
      ctx.beginPath(); ctx.roundRect(triggerLeft, pillY, trigWidth, pillH, 3); ctx.fill();
      const padX = 6;
      ctx.textAlign = "left";
      ctx.font = "10px 'Segoe UI', Arial, sans-serif";
      if (hasTrigger) {
        ctx.fillStyle = this.value.enabled ? "#fff" : "#aaa";
        const trigDisplay = this.truncateText(ctx, String(this.value.triggerWords), trigWidth - padX * 2);
        ctx.fillText(trigDisplay, triggerLeft + padX, posY + midY);
      } else {
        ctx.fillStyle = "#888";
        const placeholder = "Click to add trigger words...";
        const phDisplay = this.truncateText(ctx, placeholder, trigWidth - padX * 2);
        ctx.fillText(phDisplay, triggerLeft + padX, posY + midY);
      }
      this.hitAreas.triggerWords.bounds = [triggerLeft, 0, trigWidth, fullHeight];

      try {
      const dotRadius = 7; // larger for clickable icon
      const dotCx = triggerLeft + trigWidth - 10;
      const dotCy = posY + midY;
        let showDot = true;
        let color = "rgba(74, 158, 255, 0.85)"; // default manual/edited (blue)
        const has = hasTrigger;
        const auto = !!this.value.autoFetched;
        const attempted = !!(this as any).value?.fetchAttempted;
        if (has && auto) {
          color = "rgba(40, 167, 69, 0.85)"; // green
        } else if (has && !auto) {
          color = "rgba(74, 158, 255, 0.85)"; // blue manual
        } else if (!has && attempted) {
          color = "rgba(253, 126, 20, 0.9)"; // orange, attempted but empty
        } else {
          // No trigger and not attempted yet: show neutral gray, keep clickable
          color = "rgba(160, 160, 160, 0.7)";
        }
      if (showDot) {
        ctx.save();
        // Outer circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(dotCx, dotCy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        // Refresh arrow glyph (↻) with optional spin animation
        const now = (typeof performance !== 'undefined' && (performance as any).now) ? (performance as any).now() : Date.now();
        const spinActive = !!(this as any)._refreshSpinActive;
        const spinEnd = (this as any)._refreshSpinEnd || 0;
        const spinStart = (this as any)._refreshSpinStarted || 0;
        const isSpinning = spinActive && now < spinEnd;

        // Schedule next frame while spinning
        if (isSpinning) {
          try {
            if (!(this as any)._spinRafScheduled) {
              (this as any)._spinRafScheduled = true;
              (window.requestAnimationFrame || ((cb: any) => setTimeout(cb, 16)))(() => {
                (this as any)._spinRafScheduled = false;
                try { node.setDirtyCanvas(true, false); } catch {}
              });
            }
          } catch {}
        }

        ctx.fillStyle = '#111';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (isSpinning) {
          const period = Math.max(500, (this as any)._refreshSpinPeriod || 800); // ms per rotation
          const progress = ((now - spinStart) % period) / period;
          const angle = progress * Math.PI * 2;
          ctx.save();
          ctx.translate(dotCx, dotCy);
          ctx.rotate(angle);
          ctx.fillText('↻', 0, 0);
          ctx.restore();
        } else {
          ctx.fillText('↻', dotCx, dotCy);
        }
        ctx.restore();
        // Click bounds for refresh (always enabled)
        const size = dotRadius * 2 + 2;
        this.hitAreas.refresh.bounds = [dotCx - dotRadius, 0, size, fullHeight];
      } else {
        this.hitAreas.refresh.bounds = [0,0,0,0];
      }
      } catch {}
    } else {
      this.hitAreas.triggerWords.bounds = [0, 0, 0, 0];
    }

    if (showMoveArrows && node?.properties?.showMoveArrows !== false) {
      const arrowY = (rowHeight - arrowSize) / 2;
      let disableDown: boolean;
      let disableUp: boolean;
      if (node?.properties?.enableTags) {
        const groupWidgets = (node.customWidgets || []).filter((w: any) => w instanceof SuperLoraWidget && w.value?.tag === this.value.tag);
        const groupIndex = groupWidgets.indexOf(this as any);
        const groupLastIndex = groupWidgets.length - 1;
        disableDown = groupIndex === groupLastIndex;
        disableUp = groupIndex === 0;
      } else {
        disableDown = indexInLoras === lastIndex;
        disableUp = indexInLoras === 0;
      }

      ctx.globalAlpha = (controlsAlpha) * (disableDown ? 0.35 : 1.0);
      ctx.fillStyle = "#555"; ctx.beginPath();
      ctx.roundRect(downX, posY + arrowY, arrowSize, arrowSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText("▼", downX + arrowSize / 2, posY + midY);
      this.hitAreas.moveDown.bounds = disableDown ? [0, 0, 0, 0] : [downX, 0, arrowSize, fullHeight];

      ctx.globalAlpha = (controlsAlpha) * (disableUp ? 0.35 : 1.0);
      ctx.fillStyle = "#555"; ctx.beginPath();
      ctx.roundRect(upX, posY + arrowY, arrowSize, arrowSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText("▲", upX + arrowSize / 2, posY + midY);
      this.hitAreas.moveUp.bounds = disableUp ? [0, 0, 0, 0] : [upX, 0, arrowSize, fullHeight];

      ctx.globalAlpha = controlsAlpha;
    } else {
      this.hitAreas.moveUp.bounds = [0, 0, 0, 0];
      this.hitAreas.moveDown.bounds = [0, 0, 0, 0];
    }

    if (showStrength) {
      const sliderY = (rowHeight - sliderHeight) / 2;
      this.drawStrengthSlider(ctx, node, strengthX, posY + sliderY, sliderWidth, sliderHeight, 'strength', "#8a5cf6");
      this._strengthSliderBounds = [strengthX, 0, sliderWidth, fullHeight];

      if (node?.properties?.showSeparateStrengths) {
        this.drawStrengthSlider(ctx, node, strengthClipX, posY + sliderY, sliderWidth, sliderHeight, 'strengthClip', "#e0a72e");
        this._strengthClipSliderBounds = [strengthClipX, 0, sliderWidth, fullHeight];
      } else {
        this._strengthClipSliderBounds = [0, 0, 0, 0];
      }

      // Shared gear: opens exact value + min/max/step for both sliders on this row.
      const gearY = posY + (rowHeight - gearSize) / 2;
      ctx.fillStyle = "#3a3a3a"; ctx.beginPath();
      ctx.roundRect(gearX, gearY, gearSize, gearSize, 3);
      ctx.fill();
      ctx.strokeStyle = "#4a4a4a"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#ccc"; ctx.textAlign = "center"; ctx.font = "10px Arial";
      ctx.fillText("⚙", gearX + gearSize / 2, posY + midY + 1);
      this.hitAreas.strengthSettings.bounds = [gearX, 0, gearSize, fullHeight];
    } else {
      this._strengthSliderBounds = [0, 0, 0, 0];
      this._strengthClipSliderBounds = [0, 0, 0, 0];
      this.hitAreas.strengthSettings.bounds = [0, 0, 0, 0];
    }

    ctx.restore();

    if (node?.properties?.showRemoveButton !== false) {
      const removeY = (rowHeight - removeSize) / 2;
      ctx.fillStyle = "#3a2a2a"; ctx.beginPath();
      ctx.roundRect(removeX, posY + removeY, removeSize, removeSize, 2);
      ctx.fill();
      ctx.strokeStyle = "#5a3a3a"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText("🗑", removeX + removeSize / 2, posY + midY);
      this.hitAreas.remove.bounds = [removeX, 0, removeSize, fullHeight];
    } else {
      this.hitAreas.remove.bounds = [0,0,0,0];
    }
  }

  public isCollapsedByTag(node: any): boolean {
    if (!node.customWidgets) return false;
    const tagWidget = node.customWidgets.find((w: any) => w instanceof SuperLoraTagWidget && w.tag === this.value.tag);
    return tagWidget?.isCollapsed?.() || false;
  }

  private truncateText(ctx: any, text: string, maxWidth: number): string {
    const metrics = ctx.measureText(text);
    if (metrics.width <= maxWidth) return text;
    let truncated = text;
    while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + "...";
  }

  // ── Strength slider: drag-to-set track with a configurable range ───────────

  /** Per-row overrides win; otherwise fall back to the node-wide default range. */
  getStrengthRange(node: any): [number, number, number] {
    const min = typeof this.value.strengthMin === 'number' ? this.value.strengthMin : (node?.properties?.strengthRangeMin ?? -2);
    const max = typeof this.value.strengthMax === 'number' ? this.value.strengthMax : (node?.properties?.strengthRangeMax ?? 2);
    const step = typeof this.value.strengthStep === 'number' && this.value.strengthStep > 0
      ? this.value.strengthStep
      : (node?.properties?.strengthRangeStep ?? 0.01);
    return [min, max, step];
  }

  private roundToStep(v: number, step: number): number {
    if (!step || step <= 0) return v;
    const rounded = Math.round(v / step) * step;
    // Kill float noise (e.g. 0.1 + 0.2 style drift) without hard-coding a decimal count.
    return Math.round(rounded * 1e6) / 1e6;
  }

  private drawStrengthSlider(ctx: any, node: any, x: number, y: number, width: number, height: number, key: 'strength' | 'strengthClip', accent: string): void {
    const [min, max] = this.getStrengthRange(node);
    const span = (max - min) || 1;
    const raw = key === 'strength' ? this.value.strength : (this.value.strengthClip ?? this.value.strength ?? 1);
    const value = Number(raw) || 0;
    const ratio = Math.min(1, Math.max(0, (value - min) / span));
    const fillW = Math.max(0, Math.round(width * ratio));

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, height / 2);
    ctx.clip();

    // Track
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x, y, width, height);

    // Fill
    if (fillW > 0) {
      ctx.fillStyle = this.value.enabled ? accent : "#555";
      ctx.globalAlpha = this.value.enabled ? 0.85 : 0.5;
      ctx.fillRect(x, y, fillW, height);
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    // Value only (no "Model"/"CLIP" label - the row already has other cues for
    // which slider is which), centered and drawn twice with opposite clips so it
    // stays legible regardless of where the fill edge lands.
    const dec = 2;
    let text = value.toFixed(dec);
    if (/^-0(\.0+)?$/.test(text)) text = text.slice(1);
    ctx.font = "11px 'Segoe UI', Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const midY = y + height / 2 + 0.5;
    const midX = x + width / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x + fillW, y, Math.max(0, width - fillW), height);
    ctx.clip();
    ctx.fillStyle = this.value.enabled ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.35)";
    ctx.fillText(text, midX, midY);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, fillW, height);
    ctx.clip();
    ctx.fillStyle = "#fff";
    ctx.fillText(text, midX, midY);
    ctx.restore();

    ctx.restore();
  }

  hitDragHandle(pos: number[]): boolean {
    return this.isInBounds(pos, this._dragHandleBounds);
  }

  getSliderKeyAt(pos: number[]): 'strength' | 'strengthClip' | null {
    if (this.isInBounds(pos, this._strengthSliderBounds)) return 'strength';
    if (this.isInBounds(pos, this._strengthClipSliderBounds)) return 'strengthClip';
    return null;
  }

  /** Sets value from an X position within the row (same coordinate space as the drawn bounds). */
  setStrengthFromX(node: any, key: 'strength' | 'strengthClip', x: number): void {
    const bounds = key === 'strength' ? this._strengthSliderBounds : this._strengthClipSliderBounds;
    if (!bounds || bounds[2] <= 0) return;
    const [min, max, step] = this.getStrengthRange(node);
    const ratio = Math.min(1, Math.max(0, (x - bounds[0]) / bounds[2]));
    let v = min + ratio * (max - min);
    v = this.roundToStep(v, step);
    v = Math.min(max, Math.max(min, v));
    (this.value as any)[key] = v;
    node.setDirtyCanvas(true, false);
    try { WidgetAPI.syncExecutionWidgets(node); } catch {}
  }

  onEnabledDown = (_event: any, _pos: any, node: any): boolean => {
    this.value.enabled = !this.value.enabled;
    node.setDirtyCanvas(true, false);
    try { WidgetAPI.syncExecutionWidgets(node); } catch {}
    return true;
  };

  onLoraClick = (event: any, _pos: any, node: any): boolean => {
    WidgetAPI.showLoraSelector(node, this, event);
    return true;
  };

  onStrengthSettingsClick = (event: any, _pos: any, node: any): boolean => {
    WidgetAPI.showStrengthSettings(node, this, event);
    return true;
  };

  onMoveUpClick = (_event: any, _pos: any, node: any): boolean => {
    const idx = node.customWidgets.indexOf(this);
    if (idx <= 1) return true;
    if (node?.properties?.enableTags) {
      for (let j = idx - 1; j >= 0; j--) {
        const w = node.customWidgets[j];
        if (w instanceof SuperLoraWidget) {
          if (w.value?.tag === (this as any).value?.tag) {
            const tmp = node.customWidgets[idx];
            node.customWidgets[idx] = node.customWidgets[j];
            node.customWidgets[j] = tmp;
            break;
          } else if (!(w instanceof SuperLoraWidget)) {
            break;
          }
        }
        if (w instanceof SuperLoraTagWidget) break;
      }
    } else {
      const temp = node.customWidgets[idx];
      node.customWidgets[idx] = node.customWidgets[idx - 1];
      node.customWidgets[idx - 1] = temp;
    }
    WidgetAPI.calculateNodeSize(node);
    node.setDirtyCanvas(true, false);
    return true;
  };

  onMoveDownClick = (_event: any, _pos: any, node: any): boolean => {
    const idx = node.customWidgets.indexOf(this);
    if (idx >= node.customWidgets.length - 1) return true;
    if (node?.properties?.enableTags) {
      for (let j = idx + 1; j < node.customWidgets.length; j++) {
        const w = node.customWidgets[j];
        if (w instanceof SuperLoraWidget) {
          if (w.value?.tag === (this as any).value?.tag) {
            const tmp = node.customWidgets[idx];
            node.customWidgets[idx] = node.customWidgets[j];
            node.customWidgets[j] = tmp;
            break;
          } else if (!(w instanceof SuperLoraWidget)) {
            break;
          }
        }
        if (w instanceof SuperLoraTagWidget) break;
      }
    } else {
      const temp = node.customWidgets[idx];
      node.customWidgets[idx] = node.customWidgets[idx + 1];
      node.customWidgets[idx + 1] = temp;
    }
    WidgetAPI.calculateNodeSize(node);
    node.setDirtyCanvas(true, false);
    return true;
  };

  onTriggerWordsClick = (event: any, _pos: any, node: any): boolean => {
    try {
      try { event?.stopPropagation?.(); event?.preventDefault?.(); } catch {}
      if (WidgetAPI && typeof WidgetAPI.showInlineText === 'function') {
        const rect = (this as any)._triggerRect;
        const place = rect ? { rect, node, widget: this } : undefined as any;
        WidgetAPI.showInlineText(event, this.value.triggerWords || "", async (v: string) => {
          const newVal = String(v ?? "");
          this.value.triggerWords = newVal;
          this.value.autoFetched = false;
          (this as any).value = { ...this.value, fetchAttempted: false };
          try { TriggerWordStore.set(this.value.lora, newVal); } catch {}
          // If cleared, do NOT auto-fetch while widget remains. Fetch will occur on re-add or via refresh.
          (this as any).value = { ...this.value };
          node.setDirtyCanvas(true, true);
          try { WidgetAPI.syncExecutionWidgets(node); } catch {}
        }, place);
        return true;
      }
    } catch {}
    try {
      const app = (window as any)?.app;
      const canvas = app?.canvas;
      if (canvas?.prompt) {
        canvas.prompt("Trigger Words", this.value.triggerWords || "", async (v: any) => {
          const newVal = String(v ?? "");
          this.value.triggerWords = newVal;
          this.value.autoFetched = false;
          (this as any).value = { ...this.value, fetchAttempted: false };
          try { TriggerWordStore.set(this.value.lora, newVal); } catch {}
          // Do not auto-fetch on clear while widget remains
          node.setDirtyCanvas(true, true);
          try { WidgetAPI.syncExecutionWidgets(node); } catch {}
        }, event);
        return true;
      }
    } catch {}
    return false;
  };

  onRefreshClick = async (_event: any, _pos: any, node: any): Promise<boolean> => {
    // Start a short spin animation immediately for user feedback
    try {
      const now = (typeof performance !== 'undefined' && (performance as any).now) ? (performance as any).now() : Date.now();
      (this as any)._refreshSpinActive = true;
      (this as any)._refreshSpinStarted = now;
      (this as any)._refreshSpinEnd = now + 650; // minimum visible spin duration
      (this as any)._refreshSpinPeriod = 800; // ms per full rotation
      try { node.setDirtyCanvas(true, false); } catch {}
    } catch {}
    try {
      // Force re-fetch regardless of saved manual state
      try { TriggerWordStore.remove(this.value.lora); } catch {}
      this.value.triggerWords = '';
      this.value.autoFetched = false;
      (this as any).value = { ...this.value, fetchAttempted: false };
      await this.fetchTriggerWords();
      node.setDirtyCanvas(true, true);
      try { WidgetAPI.syncExecutionWidgets(node); } catch {}
      return true;
    } catch {
      return false;
    } finally {
      // Ensure the spin continues briefly even if operation is instant
      try {
        const now2 = (typeof performance !== 'undefined' && (performance as any).now) ? (performance as any).now() : Date.now();
        const end = Math.max(((this as any)._refreshSpinEnd || now2), now2 + 200);
        (this as any)._refreshSpinEnd = end;
        const timeoutMs = Math.max(0, end - now2);
        setTimeout(() => { (this as any)._refreshSpinActive = false; try { node.setDirtyCanvas(true, false); } catch {}; }, timeoutMs);
      } catch {}
    }
  };

  onTagClick = (_event: any, _pos: any, node: any): boolean => {
    WidgetAPI.showTagSelector(node, this);
    return true;
  };

  onRemoveClick = (_event: any, _pos: any, node: any): boolean => {
    WidgetAPI.removeLoraWidget(node, this);
    return true;
  };

  computeSize(): [number, number] {
    return [450, 50];
  }

  setLora(lora: string, node?: any): void {
    this.value.lora = lora;
    // Always reset base state on LoRA change to avoid stale trigger words
    this.value.triggerWords = '';
    this.value.autoFetched = false;
    (this as any).value = { ...this.value, fetchAttempted: false };
    if (lora !== "None") {
      // Load any manually stored trigger words first
      try {
        const manual = TriggerWordStore.get(lora);
        if (manual) {
          this.value.triggerWords = manual;
          this.value.autoFetched = false;
          return; // Do not auto-fetch if user provided
        }
      } catch {}
      // If no manual value and auto-fetch enabled, fetch (only when node context provided)
      if (node && node?.properties?.autoFetchTriggerWords !== false) {
        this.fetchTriggerWords();
      }
    }
  }

  private async fetchTriggerWords(): Promise<void> {
    try {
      (this as any).value.fetchAttempted = true;
      // Respect manual override
      try {
        const manual = TriggerWordStore.get(this.value.lora);
        if (manual) {
          this.value.triggerWords = manual;
          this.value.autoFetched = false;
          return;
        }
      } catch {}

      const words = await WidgetAPI.civitaiService.getTriggerWords(this.value.lora);
      if (words.length > 0) {
        this.value.triggerWords = words.join(", ");
        this.value.autoFetched = true;
        try { TriggerWordStore.set(this.value.lora, this.value.triggerWords); } catch {}
      } else {
        // Mark attempted with no result so the indicator shows orange
        (this as any).value = { ...this.value, fetchAttempted: true };
      }
    } catch (error) {
      console.warn("Failed to fetch trigger words:", error);
    }
  }
}


