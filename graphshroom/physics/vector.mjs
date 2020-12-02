class Vector {
    static Same(v1, v2) {
        return v1.x === v2.x && v1.y === v2.y;
    }

    static Plus(v1, v2) {
        return new Vector(v1.x + v2.x, v1.y + v2.y)
    }

    static Minus(v1, v2) {
        return new Vector(v1.x - v2.x, v1.y - v2.y)
    }

    static Multiply(v1, n) {
        return new Vector(v1.x * n, v1.y * n)
    }

    static Divide(v1, n) {
        return new Vector(v1.x / n, v1.y / n)
    }

    static Angle(v1, v2) {
        return Vector.Minus(v1, v2).direction();
    }

    static Distance(v1, v2) {
        return Math.sqrt((v1.x - v2.x) * (v1.x - v2.x) + (v1.y - v2.y) * (v1.y - v2.y));
    }

    static Magnitude(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    static Direction(v) {
        return Math.atan2(v.y, v.x);
    }

    static FromPolarCoordinates(magnitude, angle) {
        return new Vector(
            Math.cos(angle) * magnitude,
            Math.sin(angle) * magnitude
        )
    }

    static Average(vectors) {
        let avgX = 0;
        let avgY = 0;
        for (let v of vectors) {
            avgX += v.x;
            avgY += v.y;
        }
        return new Vector(avgX / vectors.length, avgY / vectors.length)
    }

    constructor(x, y) {
        this.set(x, y)
    }

    clone() {
        return new Vector(this)
    }

    set(x, y) {
        if (x != null && x.x != null && x.y != null) {
            this.set(x.x, x.y);
            return
        }
        if (x != null && y != null) {
            this.x = x;
            this.y = y;
        } else {
            this.x = 0;
            this.y = 0;
        }
    }

    plus(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    minus(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
    }

    multiply(n) {
        return new Vector(this.x * n, this.y * n);
    }

    direction() {
        return Math.atan2(this.y, this.x);
    }

    angle(v) {
        return this.minus(v).direction();
    }

    rotated(angleDelta) {
        let newDirection = this.direction() + angleDelta;
        let magnitude = this.magnitude();
        return new Vector(Math.cos(newDirection) * magnitude, Math.sin(newDirection) * magnitude);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    distance(v) {
        return this.minus(v).magnitude();
    }

    normalized() {
        const direction = this.direction();
        return new Vector(Math.cos(direction), Math.sin(direction));
    }

    setMagnitude(magnitude) {
        const direction = this.direction();
        this.x = Math.cos(direction) * magnitude;
        this.y = Math.sin(direction) * magnitude;
    }

    resized(magnitude) {
        const direction = this.direction();
        return new Vector(Math.cos(direction) * magnitude, Math.sin(direction) * magnitude);
    }

    normalize() {
        this.setMagnitude(1)
    }
}


export {Vector}