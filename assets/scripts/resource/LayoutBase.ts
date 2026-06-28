import { _decorator, Component, Node, Vec3, Prefab, instantiate } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LayoutBase')
export abstract class LayoutBase extends Component {
    @property({ type: Prefab, tooltip: '要显示的方块预制体' })
    blockPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: '方块放置的根节点' })
    layoutRoot: Node | null = null;

    /**
     * 获取下一个方块应该放置的世界位置
     */
    abstract getNextPosition(): Vec3;

    /**
     * 创建一个方块节点，放置到下一个位置
     * @returns 创建的节点
     */
    public spawnBlock(): Node | null {
        if (!this.blockPrefab || !this.layoutRoot) return null;
        const block = instantiate(this.blockPrefab);
        block.setParent(this.layoutRoot);
        block.setWorldPosition(this.getNextPosition());
        return block;
    }
}