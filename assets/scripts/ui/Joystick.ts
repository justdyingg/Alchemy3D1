import { _decorator, Component, Node, Vec2, Vec3, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Joystick')
export class Joystick extends Component {
    @property(Node) stick: Node | null = null;
    @property maxRadius: number = 80;

    private _centerPos: Vec2 = new Vec2();
    private _direction: Vec2 = new Vec2();

    start() {
        if (this.stick) this._centerPos.set(this.stick.position.x, this.stick.position.y);
    }

    public updateTouch(touchPos: Vec2) {
        const touchPos3 = new Vec3(touchPos.x, touchPos.y, 0);
        const localPos = this.node.getComponent(UITransform)?.convertToNodeSpaceAR(touchPos3);
        if (!localPos) return;
        const offsetX = localPos.x - this._centerPos.x;
        const offsetY = localPos.y - this._centerPos.y;
        const dist = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

        if (dist > this.maxRadius) {
            const scale = this.maxRadius / dist;
            if (this.stick) this.stick.setPosition(offsetX * scale, offsetY * scale, 0);
            this._direction.set(offsetX * scale / this.maxRadius, offsetY * scale / this.maxRadius);
        } else {
            if (this.stick) this.stick.setPosition(offsetX, offsetY, 0);
            this._direction.set(dist > 0.01 ? offsetX / this.maxRadius : 0, dist > 0.01 ? offsetY / this.maxRadius : 0);
        }
    }

    public getDirection(): Vec2 {
        return this._direction;
    }
}