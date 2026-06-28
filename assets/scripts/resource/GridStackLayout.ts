// assets/scripts/resource/GridStackLayout.ts
import { _decorator, Node, Vec3 } from 'cc';
import { LayoutBase } from './LayoutBase';
const { ccclass, property } = _decorator;

@ccclass('GridStackLayout')
export class GridStackLayout extends LayoutBase {
    @property({ tooltip: '每行数量（宽）' })
    gridWidth: number = 3;

    @property({ tooltip: '每列数量（深）' })
    gridDepth: number = 3;

    @property({ tooltip: '方块水平间距' })
    blockSpacing: number = 0.7;

    @property({ tooltip: '方块高度' })
    blockHeight: number = 0.3;

    @property({ tooltip: '启用显示上限' })
    enableVisibleCap: boolean = false;

    @property({ tooltip: '最大显示层数' })
    maxVisibleLayers: number = 5;

    @property({ tooltip: '每个方块代表几个单位' })
    unitsPerBlock: number = 1;

    private _blocks: Node[] = [];
    private _cellsPerLayer: number = 1;

    start() {
        this._cellsPerLayer = this.gridWidth * this.gridDepth;
    }

    public reset() {
        this._blocks.forEach(b => b.destroy());
        this._blocks = [];
    }

    public getNextPosition(): Vec3 {
        if (this._cellsPerLayer <= 0) this._cellsPerLayer = 1;
        const index = this._blocks.length;
        const layer = Math.floor(index / this._cellsPerLayer);
        const indexInLayer = index % this._cellsPerLayer;
        const row = Math.floor(indexInLayer / this.gridWidth);
        const col = indexInLayer % this.gridWidth;

        const base = this.layoutRoot!.getWorldPosition().clone();
        const offsetX = (col - (this.gridWidth - 1) * 0.5) * this.blockSpacing;
        const offsetZ = (row - (this.gridDepth - 1) * 0.5) * this.blockSpacing;
        return new Vec3(
            base.x + offsetX,
            base.y + layer * this.blockHeight + this.blockHeight * 0.5,
            base.z + offsetZ
        );
    }

    public spawnBlock(): Node | null {
        const block = super.spawnBlock();
        if (!block) return null;
        block.setWorldPosition(this.getNextPosition());
        this._blocks.push(block);

        if (this.enableVisibleCap && this.maxVisibleLayers > 0) {
            const currentLayers = Math.ceil(this._blocks.length / this._cellsPerLayer);
            if (currentLayers > this.maxVisibleLayers) {
                for (let i = 0; i < this._cellsPerLayer && this._blocks.length > 0; i++) {
                    const old = this._blocks.shift();
                    if (old) old.destroy();
                }
                this.rearrange();
            }
        }
        return block;
    }

    // 移除最底层方块
    public removeBlock(): Node | null {
        if (this._blocks.length === 0) return null;
        const node = this._blocks.shift()!;
        this.rearrange();
        return node;
    }

    public hasBlocks(): boolean {
        return this._blocks.length > 0;
    }

    public getBottomBlockWorldPos(): Vec3 | null {
        return this._blocks.length > 0 ? this._blocks[0].getWorldPosition().clone() : null;
    }

    public getTopBlockWorldPos(): Vec3 | null {
        return this._blocks.length > 0 ? this._blocks[this._blocks.length - 1].getWorldPosition().clone() : null;
    }

    private rearrange(): void {
        for (let i = 0; i < this._blocks.length; i++) {
            const layer = Math.floor(i / this._cellsPerLayer);
            const indexInLayer = i % this._cellsPerLayer;
            const row = Math.floor(indexInLayer / this.gridWidth);
            const col = indexInLayer % this.gridWidth;

            const base = this.layoutRoot!.getWorldPosition().clone();
            const offsetX = (col - (this.gridWidth - 1) * 0.5) * this.blockSpacing;
            const offsetZ = (row - (this.gridDepth - 1) * 0.5) * this.blockSpacing;
            this._blocks[i].setWorldPosition(new Vec3(
                base.x + offsetX,
                base.y + layer * this.blockHeight + this.blockHeight * 0.5,
                base.z + offsetZ
            ));
        }
    }
}