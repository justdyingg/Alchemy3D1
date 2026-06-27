import { _decorator, Component, Node, Prefab, instantiate, Camera, Vec3, UITransform, director } from 'cc';
import { Stone } from '../stone/Stone';
import { HpBarUI } from './HpBarUI';
const { ccclass, property } = _decorator;

@ccclass('HpBarManager')
export class HpBarManager extends Component {
    static instance: HpBarManager | null = null;

    @property({ type: Prefab, tooltip: '血条 UI 预制体' })
    hpBarPrefab: Prefab | null = null;

    @property({ type: Camera, tooltip: '主摄像机' })
    mainCamera: Camera | null = null;

    @property({ tooltip: '超过此距离隐藏血条' })
    displayDistance: number = 200;

    private _playerNode: Node | null = null;
    private _hpBarMap: Map<Stone, Node> = new Map();

    onLoad() {
        HpBarManager.instance = this;
    }

    start() {
        if (!this.mainCamera) {
            this.mainCamera = director.getScene()?.getComponentInChildren(Camera);
        }
        this.scanAndRegister();
        console.log('已注册石头数量:', this._hpBarMap.size);
    }

    private scanAndRegister() {
        const stones = director.getScene()?.getComponentsInChildren(Stone);
        stones?.forEach(s => this.registerStone(s));
    }

    public setPlayerNode(node: Node) {
        this._playerNode = node;
        console.log('HpBarManager: 玩家节点已绑定:', node.name);
    }

    public registerStone(stone: Stone) {
        if (this._hpBarMap.has(stone) || !this.hpBarPrefab) return;
        const hpBar = instantiate(this.hpBarPrefab);
        hpBar.setParent(this.node);
        this._hpBarMap.set(stone, hpBar);
        console.log('HpBarManager: 注册石头', stone.node.name);
    }

    public unregisterStone(stone: Stone) {
        const ui = this._hpBarMap.get(stone);
        if (ui) { ui.destroy(); this._hpBarMap.delete(stone); }
    }

    update(dt: number) {
        if (!this.mainCamera) return;
        const canvasTransform = this.node.getComponent(UITransform);
        if (!canvasTransform) return;

        this._hpBarMap.forEach((uiNode, stone) => {
            if (!stone.node.isValid) {
                this._hpBarMap.delete(stone);
                uiNode.destroy();
                return;
            }
            const stonePos = stone.node.getWorldPosition();
            // 距离隐藏（需玩家节点）
            if (this._playerNode) {
                const playerPos = this._playerNode.getWorldPosition();
                if (Vec3.distance(stonePos, playerPos) > this.displayDistance) {
                    uiNode.active = false;
                    return;
                }
            }
            const screenPos = this.mainCamera!.worldToScreen(stonePos);
            if (screenPos.z < 0) { uiNode.active = false; return; }
            uiNode.active = true;

            const localPos = canvasTransform.convertToNodeSpaceAR(screenPos);
            uiNode.setPosition(localPos.x, localPos.y + 30, 0);

            const hpUI = uiNode.getComponent(HpBarUI);
            if (hpUI) hpUI.setPercent(stone.getHpPercent());
        });
    }
}