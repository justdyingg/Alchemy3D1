import { _decorator, Component, Node, Vec3, Quat, Collider, ITriggerEvent } from 'cc';
import { Stone } from '../stone/Stone';
const { ccclass, property } = _decorator;

@ccclass('TargetLock')
export class TargetLock extends Component {
    @property({ tooltip: '锁定范围（仅参考，实际由触发器半径决定）' })
    lockRange: number = 100;

    public isLocked: boolean = false;
    public lockedTarget: Node | null = null;

    private _nearbyStones: Set<Node> = new Set();

    start() {
        const triggerNode = this.node.getChildByName('LockTrigger');
        if (triggerNode) {
            const collider = triggerNode.getComponent(Collider);
            if (collider) {
                collider.on('onTriggerEnter', this.onTriggerEnter, this);
                collider.on('onTriggerExit', this.onTriggerExit, this);
            }
        }
    }

    private onTriggerEnter(event: ITriggerEvent) {
        const other = event.otherCollider.node;
        if (other.getComponent(Stone)) this._nearbyStones.add(other);
    }

    private onTriggerExit(event: ITriggerEvent) {
        const other = event.otherCollider.node;
        this._nearbyStones.delete(other);
    }

    update(dt: number) {
        this._nearbyStones.forEach(n => { if (!n.isValid) this._nearbyStones.delete(n); });
        if (this._nearbyStones.size === 0) {
            this.isLocked = false;
            this.lockedTarget = null;
            return;
        }

        let nearest: Node = null;
        let minDist = Infinity;
        const playerPos = this.node.getWorldPosition();
        this._nearbyStones.forEach(stoneNode => {
            const dist = Vec3.distance(playerPos, stoneNode.getWorldPosition());
            if (dist < minDist) { minDist = dist; nearest = stoneNode; }
        });

        if (nearest) {
            this.isLocked = true;
            this.lockedTarget = nearest;
            const targetPos = nearest.getWorldPosition();
            const dir = new Vec3();
            Vec3.subtract(dir, targetPos, playerPos);
            dir.y = 0;
            if (dir.lengthSqr() > 0.01) {
                this.node.rotation = Quat.fromViewUp(new Quat(), dir.normalize());
            }
        }
    }
}