// assets/scripts/npc/OrderBubbleUI.ts
import { _decorator, Component, Node, Prefab, instantiate, Vec3, Camera, UITransform, Label, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('OrderBubbleUI')
export class OrderBubbleUI extends Component {
    @property({ type: Prefab, tooltip: '气泡 UI 预制体' })
    bubblePrefab: Prefab | null = null;

    @property({ type: Camera, tooltip: '主摄像机（用于 3D 转 2D）' })
    mainCamera: Camera | null = null;

    @property({ tooltip: '气泡相对 NPC 头顶的偏移（世界坐标）' })
    headOffset: Vec3 = new Vec3(0, 2.0, 0);

    // 内部使用的气泡实例
    private _bubbleNode: Node | null = null;
    private _label: Label | null = null;

    start() {
        if (!this.mainCamera) {
            this.mainCamera = director.getScene()?.getComponentInChildren(Camera) ?? null;
        }
    }

    /**
     * 显示订单
     * @param type 资源类型名称（如 'gold', 'stone'）
     * @param count 需求数量
     */
    public showOrder(type: string, count: number): void {
        if (!this.bubblePrefab) return;

        // 如果还没创建气泡，则实例化并放在 Canvas 下
        if (!this._bubbleNode) {
            this._bubbleNode = instantiate(this.bubblePrefab);
            // 寻找 Canvas 节点并挂到其下
            const canvas = director.getScene()?.getComponentInChildren(UITransform)?.node;
            if (canvas) {
                this._bubbleNode.setParent(canvas);
            } else {
                this._bubbleNode.setParent(this.node); // fallback
            }
            // 获取 Label 组件
            const textNode = this._bubbleNode.getChildByName('Text');
            if (textNode) {
                this._label = textNode.getComponent(Label);
            } else {
                this._label = this._bubbleNode.getComponentInChildren(Label);
            }
        }

        if (this._bubbleNode) {
            // 立即设置一次位置，避免闪现屏幕中心
            this.updateBubblePosition();
            this._bubbleNode.active = true;
            if (this._label) {
                this._label.string = `${type} x${count}`;
            }
        }
    }

    /**
     * 隐藏订单气泡
     */
    public hideOrder(): void {
        if (this._bubbleNode) {
            this._bubbleNode.active = false;
        }
    }

    update(dt: number) {
        // 每帧更新位置
        this.updateBubblePosition();
    }

    /**
     * 根据 NPC 世界坐标更新气泡的 Canvas 位置
     */
    private updateBubblePosition(): void {
        if (!this._bubbleNode || !this._bubbleNode.active || !this.mainCamera) return;

        // 计算 NPC 头顶的世界坐标
        const worldPos = this.node.getWorldPosition().clone().add(this.headOffset);

        // 转换为屏幕坐标
        const screenPos = this.mainCamera.worldToScreen(worldPos);
        if (screenPos.z < 0) {
            // 在相机后方，隐藏
            this._bubbleNode.active = false;
            return;
        }

        // 转换为 Canvas 局部坐标
        const canvas = this._bubbleNode.parent;
        if (canvas) {
            const canvasTransform = canvas.getComponent(UITransform);
            if (canvasTransform) {
                const localPos = canvasTransform.convertToNodeSpaceAR(screenPos);
                this._bubbleNode.setPosition(localPos.x, localPos.y, 0);
            }
        }
    }

    onDestroy() {
        if (this._bubbleNode) {
            this._bubbleNode.destroy();
            this._bubbleNode = null;
        }
    }
}