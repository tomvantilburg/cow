class Utils {
    //Generate a unique id
    idgen(){
        return 'ID'+(Math.random() * 1e17).toString();
    }
}
export let utils = new Utils();