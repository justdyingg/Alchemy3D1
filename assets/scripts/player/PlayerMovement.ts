import { _decorator, Component, RigidBody, Vec3, Quat } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerMovement')
export class PlayerMovement extends Component {
    @property({ tooltip: '移动速度' })
    moveSpeed: number = 8;

    private _rigidBody: RigidBody | null = null;
    private _moveDirection: Vec3 = new Vec3();

    start() {
        this._rigidBody = this.getComponent(RigidBody);
    }

    /**
     * 由 GameManager 调用，传入世界空间的移动方向
     */
    public setMoveDirection(dir: Vec3) {
        this._moveDirection.set(dir);
    }

    update(dt: number) {
        if (!this._rigidBody) return;

        // 保留 Y 轴速度（重力），只覆盖水平移动
        const vel = new Vec3();
        this._rigidBody.getLinearVelocity(vel);
        const targetVelX = this._moveDirection.x * this.moveSpeed;
        const targetVelZ = this._moveDirection.z * this.moveSpeed;
        this._rigidBody.setLinearVelocity(new Vec3(targetVelX, vel.y, targetVelZ));

        // 面朝移动方向
        if (this._moveDirection.lengthSqr() > 0.01) {
            const targetRot = Quat.fromViewUp(new Quat(), this._moveDirection);
            this.node.rotation = targetRot;
        }
    }
}