import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraFollow')
export class CameraFollow extends Component {
    @property({ type: Node, tooltip: '跟随目标' })
    target: Node | null = null;

    @property({ tooltip: '目标偏移' })
    offset: Vec3 = new Vec3(0, 8, -6);

    lateUpdate(dt: number) {
        if (!this.target) return;
        const targetPos = this.target.position;
        this.node.setPosition(
            targetPos.x + this.offset.x,
            targetPos.y + this.offset.y,
            targetPos.z + this.offset.z
        );
    }
}